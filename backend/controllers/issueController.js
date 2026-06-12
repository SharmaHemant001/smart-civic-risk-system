import Issue from "../models/Issue.js";
import EscalationEvent from "../models/EscalationEvent.js";
import RouteHistory from "../models/RouteHistory.js";
import { checkDuplicate } from "../services/duplicateService.js";
import { calculateRisk } from "../services/riskEngine.js";
import User from "../models/User.js";
import getLocationName from "../services/getLocationName.js";
import logAudit from "../utils/auditLogger.js";
import mongoose from "mongoose";

const COMMUNITY_RESOLUTION_THRESHOLD = 3;
const LOCATION_RISK_RADIUS = 0.02;

const getNearbyIssueCount = async (latitude, longitude, excludeId = null) => {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return 0;
  }

  const query = {
    latitude: { $gte: lat - LOCATION_RISK_RADIUS, $lte: lat + LOCATION_RISK_RADIUS },
    longitude: { $gte: lon - LOCATION_RISK_RADIUS, $lte: lon + LOCATION_RISK_RADIUS },
    status: { $nin: ["resolved", "invalid"] },
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  return Issue.countDocuments(query);
};

/**
 * Helper: Enrich issue object with dynamic risk metrics
 */
export const enrichIssueWithRisk = async (issue, weather = "clear") => {
  const nearbyIssueCount = await getNearbyIssueCount(
    issue.latitude,
    issue.longitude,
    issue._id
  );
  
  const now = new Date();
  const created = new Date(issue.createdAt || now);
  const daysUnresolved = Math.max(0, (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

  // Check if there is an active EscalationEvent in the same locationName
  const isEscalated = await EscalationEvent.exists({
    clusterId: issue.locationName,
    status: "Critical",
  }) ? true : false;

  // Check historical resolved issues in the same locationName
  const historicalActivity = await Issue.countDocuments({
    locationName: issue.locationName,
    status: "resolved",
  });

  const risk = calculateRisk({
    issueType: issue.issueType,
    votes: issue.votes,
    nearbyIssueCount,
    daysUnresolved,
    weather,
    severity: issue.severity,
    communityConfirmations: issue.communityConfirmations,
    affectedArea: issue.affectedArea,
    isEscalated,
    historicalActivity,
  });

  // Calculate dynamic SLA values
  let deadline = issue.slaDeadline;
  if (!deadline) {
    const slaDurationHours = {
      Critical: 24,
      High: 72,
      Medium: 72,
      Low: 72,
    }[risk.riskLevel] || 72;
    deadline = new Date(created.getTime() + slaDurationHours * 60 * 60 * 1000);
  }

  const deadlineTime = new Date(deadline).getTime();
  let msRemaining;
  
  if (issue.status === "resolved") {
    const resolvedTime = new Date(issue.resolvedAt || now).getTime();
    msRemaining = deadlineTime - resolvedTime;
  } else {
    msRemaining = deadlineTime - now.getTime();
  }
  
  const hoursRemaining = msRemaining / (1000 * 60 * 60);
  
  let slaStatus = "OK";
  if (msRemaining < 0) {
    slaStatus = "Breached";
  } else if (issue.status !== "resolved") {
    const createdTime = created.getTime();
    const totalDuration = deadlineTime - createdTime;
    if (totalDuration > 0 && (msRemaining / totalDuration) <= 0.25) {
      slaStatus = "Warning";
    }
  }

  return {
    ...issue.toObject(),
    baseRisk: risk.baseRisk,
    timeFactor: risk.timeFactor,
    weatherFactor: risk.weatherFactor,
    finalRisk: risk.finalRisk,
    riskLevel: risk.riskLevel,
    riskScore: risk.riskLevel,
    riskValue: risk.finalRisk,
    breakdown: risk.breakdown,
    explanation: risk.explanation,
    timeline: risk.timeline,
    slaDeadline: deadline,
    slaStatus,
    slaHoursRemaining: Math.round(hoursRemaining * 10) / 10,
  };
};

/**
 * Helper: Enrich a batch of issues in memory to resolve the N+1 query problem.
 */
export const enrichIssuesWithRiskBatch = async (issues, weather = "clear") => {
  if (issues.length === 0) return [];
  
  // Fetch all active issues (not resolved or invalid) to build nearby count mapping in memory
  const activeIssues = await Issue.find({
    status: { $nin: ["resolved", "invalid"] }
  }).select("_id latitude longitude status");
  
  const countsMap = {};
  activeIssues.forEach((activeIssue, idx) => {
    const count = activeIssues.filter((other, otherIdx) => {
      if (idx === otherIdx) return false;
      const latDiff = Math.abs(other.latitude - activeIssue.latitude);
      const lonDiff = Math.abs(other.longitude - activeIssue.longitude);
      return latDiff <= 0.02 && lonDiff <= 0.02;
    }).length;
    countsMap[activeIssue._id.toString()] = count;
  });

  // Query all active critical escalations to build in-memory map
  let escalatedClusters = new Set();
  try {
    const activeEscalations = await EscalationEvent.find({ status: "Critical" }).select("clusterId");
    escalatedClusters = new Set(activeEscalations.map(e => e.clusterId));
  } catch (err) {
    console.error("Batch escalation query failed:", err.message);
  }

  // Query historical activity count grouped by locationName in a single aggregate pipeline
  const historicalMap = {};
  try {
    const historicalStats = await Issue.aggregate([
      { $match: { status: "resolved" } },
      { $group: { _id: "$locationName", count: { $sum: 1 } } }
    ]);
    historicalStats.forEach(stat => {
      if (stat._id) historicalMap[stat._id] = stat.count;
    });
  } catch (err) {
    console.error("Batch historical aggregate query failed:", err.message);
  }

  const now = new Date();
  return issues.map(issue => {
    const nearbyIssueCount = countsMap[issue._id.toString()] || 0;
    const created = new Date(issue.createdAt || now);
    const daysUnresolved = Math.max(0, (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    
    const isEscalated = escalatedClusters.has(issue.locationName);
    const historicalActivity = historicalMap[issue.locationName] || 0;

    const risk = calculateRisk({
      issueType: issue.issueType,
      votes: issue.votes,
      nearbyIssueCount,
      daysUnresolved,
      weather,
      severity: issue.severity,
      communityConfirmations: issue.communityConfirmations,
      affectedArea: issue.affectedArea,
      isEscalated,
      historicalActivity,
    });

    let deadline = issue.slaDeadline;
    if (!deadline) {
      const slaDurationHours = {
        Critical: 24,
        High: 72,
        Medium: 72,
        Low: 72,
      }[risk.riskLevel] || 72;
      deadline = new Date(created.getTime() + slaDurationHours * 60 * 60 * 1000);
    }

    const deadlineTime = new Date(deadline).getTime();
    let msRemaining;
    if (issue.status === "resolved") {
      const resolvedTime = new Date(issue.resolvedAt || now).getTime();
      msRemaining = deadlineTime - resolvedTime;
    } else {
      msRemaining = deadlineTime - now.getTime();
    }

    const hoursRemaining = msRemaining / (1000 * 60 * 60);
    let slaStatus = "OK";
    if (msRemaining < 0) {
      slaStatus = "Breached";
    } else if (issue.status !== "resolved") {
      const createdTime = created.getTime();
      const totalDuration = deadlineTime - createdTime;
      if (totalDuration > 0 && (msRemaining / totalDuration) <= 0.25) {
        slaStatus = "Warning";
      }
    }

    const doc = issue.toObject ? issue.toObject() : issue;

    return {
      ...doc,
      baseRisk: risk.baseRisk,
      timeFactor: risk.timeFactor,
      weatherFactor: risk.weatherFactor,
      finalRisk: risk.finalRisk,
      riskLevel: risk.riskLevel,
      riskScore: risk.riskLevel,
      riskValue: risk.finalRisk,
      breakdown: risk.breakdown,
      explanation: risk.explanation,
      timeline: risk.timeline,
      slaDeadline: deadline,
      slaStatus,
      slaHoursRemaining: Math.round(hoursRemaining * 10) / 10,
    };
  });
};

/* =========================
   🚀 UPLOAD ISSUE
   ========================= */
export const uploadIssue = async (req, res) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  try {
    const {
      latitude,
      longitude,
      issueType,
      description,
      aiPrediction,
      aiConfidence,
      userCategory,
      severity,
      affectedArea,
      customIssueType,
      address,
      photos,
      bypassDuplicate = false
    } = req.body;
    const weather = req.body?.weather || req.query?.weather || "clear";

    const imageUrl = req.body.imageUrl || null;
    const uploadedImageData = req.file
      ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
      : null;

    if (!latitude || !longitude || !issueType) {
      return res.status(400).json({ message: "Missing fields" });
    }

    let locationName = "Unknown";
    try {
      locationName = await getLocationName(latitude, longitude);
    } catch(err) {
      console.log("location fetch failed", err.message);
    }

    const user = await User.findOne();

    if (user && user.reputationScore < -5) {
      return res.status(403).json({
        error: "Low reputation. Cannot report issues.",
      });
    }

    // Check duplicate if not explicitly bypassed by the user
    if (!bypassDuplicate) {
      const existingIssue = await checkDuplicate(
        latitude,
        longitude,
        issueType
      );

      if (existingIssue) {
        existingIssue.votes += 1;
        if (imageUrl || uploadedImageData) {
          existingIssue.imageUrl = imageUrl || uploadedImageData;
        }
        if (description && !existingIssue.description) {
          existingIssue.description = description;
        }
        if (
          locationName &&
          locationName !== "Unknown" &&
          (!existingIssue.locationName || existingIssue.locationName === "Unknown")
        ) {
          existingIssue.locationName = locationName;
        }

        const enrichedDuplicate = await enrichIssueWithRisk(existingIssue, weather);
        existingIssue.riskScore = enrichedDuplicate.riskLevel;
        existingIssue.riskValue = enrichedDuplicate.finalRisk;
        await existingIssue.save();

        return res.json({
          message: "Duplicate issue found, vote increased",
          issue: enrichedDuplicate,
        });
      }
    }

    // Create issue
    const nearbyIssueCount = await getNearbyIssueCount(latitude, longitude);
    
    // Check if there is an active EscalationEvent in the same locationName
    const isEscalated = await EscalationEvent.exists({
      clusterId: locationName,
      status: "Critical",
    }) ? true : false;

    // Check historical resolved issues in the same locationName
    const historicalActivity = await Issue.countDocuments({
      locationName: locationName,
      status: "resolved",
    });

    const initialRisk = calculateRisk({
      issueType,
      votes: 1,
      nearbyIssueCount,
      daysUnresolved: 0,
      weather,
      severity,
      communityConfirmations: 0,
      affectedArea,
      isEscalated,
      historicalActivity,
    });

    const slaDurationHours = {
      Critical: 24,
      High: 72,
      Medium: 72,
      Low: 72,
    }[initialRisk.riskLevel] || 72;
    const slaDeadline = new Date();
    slaDeadline.setHours(slaDeadline.getHours() + slaDurationHours);

    const parsedConfidence = aiConfidence !== undefined && aiConfidence !== null ? Number(aiConfidence) : null;
    const resolvedFinalCategory = issueType;
    let predictionMatched = null;
    if (aiPrediction) {
      predictionMatched = (aiPrediction === resolvedFinalCategory);
    }

    let photosList = [];
    if (photos && Array.isArray(photos)) {
      photosList = [...photos];
    }
    if (imageUrl || uploadedImageData) {
      photosList.push(imageUrl || uploadedImageData);
    }

    const newIssue = await Issue.create({
      imageUrl: imageUrl || uploadedImageData || (photosList.length > 0 ? photosList[0] : null),
      photos: photosList,
      issueType,
      severity: severity || "Low",
      affectedArea: affectedArea || "Road",
      customIssueType: issueType === "other" ? customIssueType : null,
      address: address || "",
      description: description || "",
      latitude,
      longitude,
      expiresAt,
      locationName,
      votes: 1,
      riskScore: initialRisk.riskLevel,
      riskValue: initialRisk.finalRisk,
      status: "pending",
      reportedBy: user ? user._id : null,
      slaDeadline,
      aiPrediction: aiPrediction || null,
      aiConfidence: parsedConfidence,
      userCategory: userCategory || null,
      finalCategory: resolvedFinalCategory,
      predictionMatched,
    });

    const enrichedNewIssue = await enrichIssueWithRisk(newIssue, weather);

    res.status(201).json(enrichedNewIssue);

  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   🔍 CHECK DUPLICATE REPORT
   ========================= */
export const checkDuplicateReport = async (req, res) => {
  try {
    const { latitude, longitude, issueType } = req.query;
    if (!latitude || !longitude || !issueType) {
      return res.status(400).json({ error: "Missing latitude, longitude, or issueType" });
    }

    const duplicate = await checkDuplicate(latitude, longitude, issueType);
    if (duplicate) {
      const enriched = await enrichIssueWithRisk(duplicate);
      return res.json({ duplicateFound: true, issue: enriched });
    }

    return res.json({ duplicateFound: false });
  } catch (error) {
    console.error("CHECK DUPLICATE ROUTE ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
};

/* =========================
   👍 CONFIRM ISSUE (Community Verification)
   ========================= */
export const confirmIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({ error: "Issue not found" });
    }

    // Increment communityConfirmations
    issue.communityConfirmations = (issue.communityConfirmations || 0) + 1;

    // Recalculate risk using updated parameters
    const weather = req.body?.weather || req.query?.weather || "clear";
    const enriched = await enrichIssueWithRisk(issue, weather);
    
    issue.riskScore = enriched.riskLevel;
    issue.riskValue = enriched.finalRisk;
    await issue.save();

    const finalEnriched = await enrichIssueWithRisk(issue, weather);
    return res.json({
      message: "Community confirmation recorded, risk score updated",
      issue: finalEnriched
    });
  } catch (error) {
    console.error("CONFIRM ISSUE ROUTE ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
};

/* =========================
   📥 GET ISSUES
   ========================= */
export const getIssues = async (req, res) => {
  try {
    const weather = req.query.weather || "clear";
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const skip = (page - 1) * limit;

    const query = { isDeleted: { $ne: true } };

    const issues = await Issue.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Enforce geocoding in a batch manner for the paginated subset
    for (const issue of issues) {
      if (
        issue.latitude &&
        issue.longitude &&
        (!issue.locationName || issue.locationName === "Unknown")
      ) {
        const resolvedLocation = await getLocationName(
          issue.latitude,
          issue.longitude
        );

        if (resolvedLocation && resolvedLocation !== "Unknown") {
          issue.locationName = resolvedLocation;
          await issue.save();
        }
      }
    }

    const processedIssues = await enrichIssuesWithRiskBatch(issues, weather);
    res.json(processedIssues);
  } catch (error) {
    console.error("GET ISSUES ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   👍 VOTE ISSUE
   ========================= */
export const voteIssue = async (req, res) => {
  try {
    const weather = req.body.weather || req.query.weather || "clear";
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    issue.votes += 1;
    const enriched = await enrichIssueWithRisk(issue, weather);
    issue.riskScore = enriched.riskLevel;
    issue.riskValue = enriched.finalRisk;
    await issue.save();

    res.json(enriched);
  } catch (error) {
    console.error("VOTE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   ✅ VALIDATE ISSUE
   ========================= */
export const validateIssue = async (req, res) => {
  try {
    const { vote, weather = "clear" } = req.body;

    if (!["yes", "no"].includes(vote)) {
      return res.status(400).json({ message: "Invalid validation vote" });
    }

    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    issue.validationVotes[vote] += 1;

    const yesVotes = issue.validationVotes.yes;
    const noVotes = issue.validationVotes.no;

    if (
      yesVotes >= COMMUNITY_RESOLUTION_THRESHOLD &&
      yesVotes > noVotes &&
      issue.status !== "resolved"
    ) {
      issue.status = "resolved";
      issue.resolvedAt = new Date();
    }

    const enriched = await enrichIssueWithRisk(issue, weather);
    issue.riskScore = enriched.riskLevel;
    issue.riskValue = enriched.finalRisk;
    await issue.save();

    res.json({
      message:
        issue.status === "resolved"
          ? "Issue marked as resolved by community"
          : "Validation vote recorded",
      issue: enriched,
      threshold: COMMUNITY_RESOLUTION_THRESHOLD,
    });
  } catch (error) {
    console.error("VALIDATION ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   🚗 UPDATE STATUS
   ========================= */
export const updateStatus = async (req, res) => {
  try {
    const { status, weather = "clear" } = req.body;
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    if (issue.status === status || issue.status === "resolved") {
      const enriched = await enrichIssueWithRisk(issue, weather);
      return res.json(enriched);
    }

    issue.status = status;

    if (status === "resolved") {
      issue.resolvedAt = new Date();

      if (issue.reportedBy) {
        const user = await User.findById(issue.reportedBy);
        if (user) {
          user.reputationScore += 1;
          await user.save();
        }
      }
    }

    const enriched = await enrichIssueWithRisk(issue, weather);
    issue.riskScore = enriched.riskLevel;
    issue.riskValue = enriched.finalRisk;
    await issue.save();

    res.json(enriched);

  } catch (error) {
    console.error("STATUS UPDATE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   📊 GET STATS (WEATHER-AWARE)
   ========================= */
export const getStats = async (req, res) => {
  try {
    const weather = req.query.weather || "clear";
    const issues = await Issue.find().select("issueType votes latitude longitude createdAt slaDeadline status riskValue");

    const enrichedIssues = await enrichIssuesWithRiskBatch(issues, weather);

    const total = enrichedIssues.length;
    const active = enrichedIssues.filter(i =>
      ["pending", "in-progress", "need-review"].includes(i.status)
    ).length;

    // Risk levels breakdown
    const riskCounts = {};
    enrichedIssues.forEach(i => {
      riskCounts[i.riskLevel] = (riskCounts[i.riskLevel] || 0) + 1;
    });
    const riskBreakdown = Object.entries(riskCounts).map(([key, val]) => ({
      _id: key,
      count: val,
    }));

    // Status breakdown
    const statusCounts = {};
    enrichedIssues.forEach(i => {
      statusCounts[i.status] = (statusCounts[i.status] || 0) + 1;
    });
    const statusBreakdown = Object.entries(statusCounts).map(([key, val]) => ({
      _id: key,
      count: val,
    }));

    res.status(200).json({
      total,
      active,
      riskBreakdown,
      statusBreakdown,
    });
  } catch (error) {
    console.error("STATS ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   🔥 GET TOP AREAS
   ========================= */
export const getTopAreas = async (req, res) => {
  try {
    const weather = req.query.weather || "clear";
    
    // Fetch active issues only (excludes resolved/invalid)
    const activeIssuesRaw = await Issue.find({
      status: { $nin: ["resolved", "invalid"] },
      locationName: { $nin: [null, "", "Unknown"] },
      isDeleted: { $ne: true }
    }).select("issueType votes latitude longitude createdAt slaDeadline status riskValue locationName");

    const activeIssues = await enrichIssuesWithRiskBatch(activeIssuesRaw, weather);

    const areaMap = {};

    activeIssues.forEach(issue => {
      const area = issue.locationName;
      if (!areaMap[area]) {
        areaMap[area] = {
          area,
          totalIssues: 0,
          criticalIssues: 0,
          sumRisk: 0,
          recentCount: 0,
          olderCount: 0,
        };
      }

      const item = areaMap[area];
      item.totalIssues += 1;
      if (issue.riskLevel === "Critical") {
        item.criticalIssues += 1;
      }
      item.sumRisk += (issue.finalRisk || issue.riskValue || 0);

      const now = new Date();
      const created = new Date(issue.createdAt);
      const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays <= 7) {
        item.recentCount += 1;
      } else if (diffDays <= 14) {
        item.olderCount += 1;
      }
    });

    const areaList = Object.values(areaMap);
    let maxDensity = 0;
    let maxCritical = 0;
    areaList.forEach(item => {
      if (item.totalIssues > maxDensity) maxDensity = item.totalIssues;
      if (item.criticalIssues > maxCritical) maxCritical = item.criticalIssues;
    });

    const areas = await Promise.all(areaList.map(async (item) => {
      const averageRisk = item.totalIssues > 0 ? item.sumRisk / item.totalIssues : 0;
      const densityScore = maxDensity > 0 ? (item.totalIssues / maxDensity) * 100 : 0;
      const criticalIssueScore = maxCritical > 0 ? (item.criticalIssues / maxCritical) * 100 : 0;

      // Formula: CRI = 0.5 * AverageRisk + 0.3 * DensityScore + 0.2 * CriticalIssueScore
      const rawCRI = (0.5 * averageRisk) + (0.3 * densityScore) + (0.2 * criticalIssueScore);
      const cri = Math.max(0, Math.min(100, Math.round(rawCRI)));

      let trend = "→ Stable";
      const change = item.recentCount - item.olderCount;
      if (change > 0) {
        trend = `↑ ${Math.round((change / Math.max(1, item.olderCount)) * 100)}%`;
      } else if (change < 0) {
        trend = `↓ ${Math.round((Math.abs(change) / Math.max(1, item.olderCount)) * 100)}%`;
      }

      const escalations = await EscalationEvent.countDocuments({ clusterId: item.area });

      return {
        _id: item.area,
        cri,
        totalIssues: item.totalIssues,
        criticalIssues: item.criticalIssues,
        trend,
        escalations,
        severityScore: Math.round(averageRisk * 10) / 10,
        densityScore: Math.round(densityScore * 10) / 10,
        criticalIssueScore: Math.round(criticalIssueScore * 10) / 10,
      };
    }));

    areas.sort((a, b) => b.cri - a.cri);

    res.status(200).json(areas);
  } catch (error) {
    console.error("TOP AREAS ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   📊 GET HOMEPAGE STATS (WEATHER-AWARE)
   ========================= */
export const getHomepageStats = async (req, res) => {
  const startDbTime = Date.now();
  try {
    const weather = req.query.weather || "clear";
    const issues = await Issue.find({ isDeleted: { $ne: true } }).select("issueType votes latitude longitude createdAt slaDeadline status riskValue locationName");

    const enrichedIssues = await enrichIssuesWithRiskBatch(issues, weather);

    const total = enrichedIssues.length;
    const critical = enrichedIssues.filter(i =>
      i.riskLevel === "Critical" && !["resolved", "invalid"].includes(i.status)
    ).length;

    const resolved = enrichedIssues.filter(i => i.status === "resolved").length;
    const resolvedPercentage = total > 0 ? Math.round((resolved / total) * 100) : 0;

    const activeIssues = enrichedIssues.filter(i => !["resolved", "invalid"].includes(i.status));
    const criScore = activeIssues.length > 0
      ? Math.round(activeIssues.reduce((sum, i) => sum + (i.finalRisk || i.riskValue || 0), 0) / activeIssues.length)
      : 0;

    // Group by risk level
    const riskCounts = {};
    enrichedIssues.forEach(i => {
      riskCounts[i.riskLevel] = (riskCounts[i.riskLevel] || 0) + 1;
    });

    // Group by status
    const statusCounts = {};
    enrichedIssues.forEach(i => {
      statusCounts[i.status] = (statusCounts[i.status] || 0) + 1;
    });

    // Group by type
    const typeCounts = {};
    enrichedIssues.forEach(i => {
      typeCounts[i.issueType] = (typeCounts[i.issueType] || 0) + 1;
    });

    // Calculate Platform Health
    const reportsToday = await Issue.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, isDeleted: { $ne: true } });
    const activeHazards = await Issue.countDocuments({ status: { $nin: ["resolved", "invalid"] }, isDeleted: { $ne: true } });
    const escalationsCount = await EscalationEvent.countDocuments();
    const protectedRoutesCount = await RouteHistory.countDocuments();

    // AI Accuracy calculation (Priority 7 Change #1)
    const totalAIClassified = await Issue.countDocuments({ aiPrediction: { $ne: null }, isDeleted: { $ne: true } });
    const correctAIClassified = await Issue.countDocuments({ aiPrediction: { $ne: null }, predictionMatched: true, isDeleted: { $ne: true } });
    
    let aiAccuracyStr = "N/A";
    if (totalAIClassified > 0) {
      aiAccuracyStr = `${Math.round((correctAIClassified / totalAIClassified) * 100)}%`;
    }

    const dbLatency = Date.now() - startDbTime;
    const dbConnected = mongoose.connection.readyState === 1;
    const platformHealth = {
      reportsToday,
      activeHazards,
      escalations: escalationsCount,
      protectedRoutes: protectedRoutesCount,
      aiAccuracy: aiAccuracyStr,
      dbConnected,
      dbLatency: dbLatency > 0 ? dbLatency : 0
    };

    // Live Ticker messages (Dynamic from actual DB entries)
    const lastEscalation = await EscalationEvent.findOne().sort({ timestamp: -1 });
    const lastResolved = await Issue.findOne({ status: "resolved", isDeleted: { $ne: true } }).sort({ resolvedAt: -1, createdAt: -1 });
    const lastCritical = await Issue.findOne({ riskScore: "Critical", status: { $nin: ["resolved", "invalid"] }, isDeleted: { $ne: true } }).sort({ createdAt: -1 });

    const liveActivity = [];

    if (lastEscalation) {
      const hoursAgo = Math.max(1, Math.round((Date.now() - new Date(lastEscalation.timestamp).getTime()) / (1000 * 60 * 60)));
      const timeStr = hoursAgo > 24 ? "yesterday" : `${hoursAgo}h ago`;
      liveActivity.push(`🟠 Escalation alert active in ${lastEscalation.clusterId} (${Math.round(lastEscalation.riskIncrease)}% growth, ${timeStr})`);
    }

    if (lastResolved) {
      const msDiff = Date.now() - new Date(lastResolved.resolvedAt || lastResolved.createdAt).getTime();
      const minutesAgo = Math.max(1, Math.round(msDiff / (1000 * 60)));
      const timeStr = minutesAgo > 60 ? `${Math.round(minutesAgo / 60)}h ago` : `${minutesAgo}m ago`;
      liveActivity.push(`🟢 Resolved: ${lastResolved.issueType} issue in ${lastResolved.locationName || "NCR"} (${timeStr})`);
    }

    if (lastCritical) {
      const msDiff = Date.now() - new Date(lastCritical.createdAt).getTime();
      const minutesAgo = Math.max(1, Math.round(msDiff / (1000 * 60)));
      const timeStr = minutesAgo > 60 ? `${Math.round(minutesAgo / 60)}h ago` : `${minutesAgo}m ago`;
      liveActivity.push(`🔴 Critical Alert: ${lastCritical.issueType} reported in ${lastCritical.locationName || "NCR"} (${timeStr})`);
    }

    const forecastTimeStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    liveActivity.push(`🔄 Forecast models synchronized with weather feed (${forecastTimeStr})`);

    // If there are no actual events (only the sync message), or if it's completely empty
    if (liveActivity.length <= 1) {
      liveActivity.unshift("No significant operational events recorded in the last 24 hours.");
    }

    res.status(200).json({
      summary: {
        total,
        critical,
        resolved,
        resolvedPercentage,
        active: total - resolved,
        criScore,
      },
      breakdown: {
        byRisk: riskCounts,
        byStatus: statusCounts,
        byType: typeCounts,
      },
      platformHealth,
      liveActivity
    });
  } catch (error) {
    console.error("HOMEPAGE STATS ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/* =====================================
   🗑️ SOFT DELETE ISSUE
===================================== */
export const deleteIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const issue = await Issue.findById(id);

    if (!issue) {
      return res.status(404).json({ error: "Issue not found" });
    }

    issue.isDeleted = true;
    issue.deletedAt = new Date();
    issue.deletedBy = req.user ? req.user.id : null;
    await issue.save();

    // Log audit action
    await logAudit({
      userId: req.user ? req.user.id : null,
      email: req.user ? req.user.email : "Anonymous",
      role: req.user ? req.user.role : "Anonymous",
      action: "ISSUE_RESOLVED", // Track as warning severity audit log
      entityType: "Issue",
      entityId: issue._id,
      severity: "WARNING",
      ipAddress: req.ip
    });

    res.status(200).json({ message: "Issue soft-deleted successfully", id });
  } catch (error) {
    console.error("DELETE ISSUE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

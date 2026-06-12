import Issue from "../models/Issue.js";
import EscalationEvent from "../models/EscalationEvent.js";
import RouteHistory from "../models/RouteHistory.js";
import { enrichIssuesWithRiskBatch } from "./issueController.js";
import logAudit from "../utils/auditLogger.js";
import { computeNearbyCounts, getCityForecast, getAreaForecasts } from "../services/forecastService.js";

/* =====================================
   📊 GET SUMMARY STATS
===================================== */
export const getStats = async (req, res) => {
  try {
    const weather = req.query.weather || "clear";
    
    // Optimize: retrieve only necessary fields for summary calculations, ignoring soft-deleted
    const issues = await Issue.find({ isDeleted: { $ne: true } }).select(
      "issueType votes latitude longitude createdAt resolvedAt slaDeadline status riskValue locationName"
    );

    const enrichedIssues = await enrichIssuesWithRiskBatch(issues, weather);

    const activeIssues = enrichedIssues.filter(
      i => !["resolved", "invalid"].includes(i.status)
    );

    const totalIssues = enrichedIssues.length;
    const criticalIssues = activeIssues.filter(i => i.riskLevel === "Critical").length;
    const breachedSlaIssues = activeIssues.filter(i => i.slaStatus === "Breached").length;

    const cityRiskIndex = activeIssues.length > 0
      ? Math.round(activeIssues.reduce((sum, i) => sum + i.finalRisk, 0) / activeIssues.length)
      : 0;

    // Calculate Municipal Response Performance metrics
    const resolvedIssues = enrichedIssues.filter(i => i.status === "resolved");
    
    let avgResolutionTimeDays = 0;
    if (resolvedIssues.length > 0) {
      const totalDurationMs = resolvedIssues.reduce((sum, i) => {
        const created = new Date(i.createdAt);
        const resolved = i.resolvedAt ? new Date(i.resolvedAt) : new Date();
        return sum + Math.max(0, resolved.getTime() - created.getTime());
      }, 0);
      avgResolutionTimeDays = Math.round((totalDurationMs / resolvedIssues.length) / (1000 * 60 * 60 * 24) * 10) / 10;
    }

    const nonBreached = enrichedIssues.filter(i => i.slaStatus !== "Breached").length;
    const slaComplianceRate = enrichedIssues.length > 0 ? Math.round((nonBreached / enrichedIssues.length) * 100) : 100;
    const criticalResolved = enrichedIssues.filter(i => i.status === "resolved" && i.riskLevel === "Critical").length;
    const escalationsPrevented = enrichedIssues.filter(i => i.status === "resolved" && ["High", "Critical"].includes(i.riskLevel)).length;

    // Find highest risk neighborhood under observation
    const areaMap = {};
    activeIssues.forEach(issue => {
      const area = issue.locationName || "Unknown";
      if (!areaMap[area]) {
        areaMap[area] = { totalIssues: 0, criticalIssues: 0, sumRisk: 0 };
      }
      areaMap[area].totalIssues += 1;
      if (issue.riskLevel === "Critical") areaMap[area].criticalIssues += 1;
      areaMap[area].sumRisk += (issue.finalRisk || 0);
    });

    let underObservation = "Saket";
    let maxCRI = -1;
    let maxDensity = 0;
    let maxCritical = 0;
    const areaList = Object.values(areaMap);
    areaList.forEach(item => {
      if (item.totalIssues > maxDensity) maxDensity = item.totalIssues;
      if (item.criticalIssues > maxCritical) maxCritical = item.criticalIssues;
    });

    Object.entries(areaMap).forEach(([area, item]) => {
      if (area === "Unknown") return;
      const averageRisk = item.totalIssues > 0 ? item.sumRisk / item.totalIssues : 0;
      const densityScore = maxDensity > 0 ? (item.totalIssues / maxDensity) * 100 : 0;
      const criticalScore = maxCritical > 0 ? (item.criticalIssues / maxCritical) * 100 : 0;
      const cri = Math.round((0.5 * averageRisk) + (0.3 * densityScore) + (0.2 * criticalScore));
      if (cri > maxCRI) {
        maxCRI = cri;
        underObservation = area;
      }
    });

    res.status(200).json({
      totalIssues,
      criticalIssues,
      breachedSlaIssues,
      cityRiskIndex,
      municipalPerformance: {
        avgResolutionTimeDays,
        slaComplianceRate,
        criticalResolved,
        escalationsPrevented,
        underObservation
      }
    });
  } catch (error) {
    console.error("AUTHORITY STATS ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/* =====================================
   📥 GET ISSUES (FILTERED, PAGINATED & SORTED)
===================================== */
export const getIssues = async (req, res) => {
  try {
    const weather = req.query.weather || "clear";
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const skip = (page - 1) * limit;

    // Build optimized Mongo query filter to reduce memory usage
    const query = { isDeleted: { $ne: true } };

    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.issueType) {
      query.issueType = req.query.issueType;
    }
    if (req.query.riskLevel) {
      query.riskScore = req.query.riskLevel;
    }
    if (req.query.slaStatus) {
      query.slaStatus = req.query.slaStatus;
    }
    if (req.query.search) {
      const q = req.query.search;
      query.$or = [
        { description: { $regex: q, $options: "i" } },
        { locationName: { $regex: q, $options: "i" } }
      ];
    }

    // Load only matching and paginated issue documents
    const issues = await Issue.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const enrichedIssues = await enrichIssuesWithRiskBatch(issues, weather);

    // Default Sorting:
    // 1. Breached SLA issues (unresolved and breached deadline)
    // 2. Critical Risk desc
    // 3. High Risk desc
    const sortedResult = [...enrichedIssues].sort((a, b) => {
      const aUnresolved = !["resolved", "invalid"].includes(a.status);
      const bUnresolved = !["resolved", "invalid"].includes(b.status);
      const aBreached = aUnresolved && a.slaStatus === "Breached";
      const bBreached = bUnresolved && b.slaStatus === "Breached";

      if (aBreached && !bBreached) return -1;
      if (!aBreached && bBreached) return 1;

      return (b.finalRisk || 0) - (a.finalRisk || 0);
    });

    res.status(200).json(sortedResult);
  } catch (error) {
    console.error("AUTHORITY ISSUES ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/* =====================================
   🏙️ GET AREAS (CRI RANKINGS)
===================================== */
export const getAreas = async (req, res) => {
  try {
    const weather = req.query.weather || "clear";
    
    // Fetch active issues only (excludes resolved/invalid) and project fields
    const activeIssuesRaw = await Issue.find({
      status: { $nin: ["resolved", "invalid"] }
    }).select("issueType votes latitude longitude createdAt slaDeadline status riskValue locationName");

    const activeIssues = await enrichIssuesWithRiskBatch(activeIssuesRaw, weather);

    const areaMap = {};

    activeIssues.forEach(issue => {
      const area = issue.locationName || "Unknown";
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
      item.sumRisk += (issue.finalRisk || 0);

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
        area: item.area,
        cri,
        totalIssues: item.totalIssues,
        criticalIssues: item.criticalIssues,
        trend,
        escalations,
      };
    }));

    areas.sort((a, b) => b.cri - a.cri);

    const rankedAreas = areas.map((a, idx) => ({
      rank: idx + 1,
      ...a,
    }));

    res.status(200).json(rankedAreas);
  } catch (error) {
    console.error("AUTHORITY AREAS ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/* =====================================
   📊 GET RESOLUTION ANALYTICS
===================================== */
export const getAnalytics = async (req, res) => {
  try {
    const weather = req.query.weather || "clear";
    
    // Select required fields
    const issues = await Issue.find().select(
      "issueType votes latitude longitude createdAt resolvedAt slaDeadline status riskValue"
    );

    const enrichedIssues = await enrichIssuesWithRiskBatch(issues, weather);

    const total = enrichedIssues.length;
    const openIssues = enrichedIssues.filter(
      i => !["resolved", "invalid"].includes(i.status)
    ).length;
    const resolvedIssues = enrichedIssues.filter(i => i.status === "resolved").length;
    const resolutionRate = total > 0 ? Math.round((resolvedIssues / total) * 100) : 0;

    const resolvedList = enrichedIssues.filter(
      i => i.status === "resolved" && i.resolvedAt
    );
    let avgResolutionTimeHours = 0;
    if (resolvedList.length > 0) {
      const totalDurationMs = resolvedList.reduce((sum, i) => {
        const created = new Date(i.createdAt);
        const resolved = new Date(i.resolvedAt);
        return sum + Math.max(0, resolved.getTime() - created.getTime());
      }, 0);
      avgResolutionTimeHours =
        Math.round((totalDurationMs / resolvedList.length) / (1000 * 60 * 60) * 10) / 10;
    }

    const criticalList = enrichedIssues.filter(
      i => i.riskLevel === "Critical" || i.riskScore === "Critical"
    );
    const resolvedCritical = criticalList.filter(i => i.status === "resolved").length;
    const criticalResolutionRate = criticalList.length > 0
      ? Math.round((resolvedCritical / criticalList.length) * 100)
      : 0;

    // Grouping trend aggregates in memory
    const dailyTrend = [];
    const now = new Date();
    for (let d = 29; d >= 0; d--) {
      const date = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];

      const reported = enrichedIssues.filter(i => {
        const cDate = new Date(i.createdAt).toISOString().split("T")[0];
        return cDate === dateStr;
      }).length;

      const resolved = enrichedIssues.filter(i => {
        if (i.status !== "resolved" || !i.resolvedAt) return false;
        const rDate = new Date(i.resolvedAt).toISOString().split("T")[0];
        return rDate === dateStr;
      }).length;

      dailyTrend.push({
        date: dateStr,
        reported,
        resolved,
      });
    }

    res.status(200).json({
      summary: {
        openIssues,
        resolvedIssues,
        resolutionRate,
        avgResolutionTimeHours,
        criticalResolutionRate,
      },
      dailyTrend,
    });
  } catch (error) {
    console.error("AUTHORITY ANALYTICS ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/* =====================================
   🛠️ POST BULK ACTION UPDATES
===================================== */
export const bulkUpdate = async (req, res) => {
  try {
    const { ids, action, weather = "clear" } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No issue IDs provided" });
    }

    const now = new Date();

    if (action === "resolved") {
      await Issue.updateMany(
        { _id: { $in: ids } },
        { $set: { status: "resolved", resolvedAt: now } }
      );
    } else if (action === "in-progress") {
      await Issue.updateMany(
        { _id: { $in: ids } },
        { $set: { status: "in-progress", resolvedAt: null } }
      );
    } else if (action === "recalculate") {
      // Recalculates and updates specific issue values
      const list = await Issue.find({ _id: { $in: ids } });
      const enriched = await enrichIssuesWithRiskBatch(list, weather);
      for (const item of enriched) {
        await Issue.findByIdAndUpdate(item._id, {
          $set: {
            riskScore: item.riskLevel,
            riskValue: item.finalRisk
          }
        });
      }
    } else {
      return res.status(400).json({ error: "Invalid action" });
    }

    // Log the bulk update action
    await logAudit({
      userId: req.user ? req.user.id : null,
      email: req.user ? req.user.email : "Anonymous",
      role: req.user ? req.user.role : "Anonymous",
      action: "BULK_UPDATE",
      entityType: "Issue",
      entityId: ids[0], // Reference first changed ID
      severity: "WARNING",
      ipAddress: req.ip
    });

    res.status(200).json({ message: `Successfully updated ${ids.length} issues` });
  } catch (error) {
    console.error("AUTHORITY BULK UPDATE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/* =====================================
   📥 EXPORT CSV
===================================== */
export const exportCsv = async (req, res) => {
  try {
    const weather = req.query.weather || "clear";
    
    // Apply filters directly to DB query
    const query = { isDeleted: { $ne: true } };
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.issueType) {
      query.issueType = req.query.issueType;
    }
    if (req.query.riskLevel) {
      query.riskScore = req.query.riskLevel;
    }
    if (req.query.slaStatus) {
      query.slaStatus = req.query.slaStatus;
    }
    if (req.query.search) {
      const q = req.query.search;
      query.$or = [
        { description: { $regex: q, $options: "i" } },
        { locationName: { $regex: q, $options: "i" } }
      ];
    }

    const issues = await Issue.find(query).select(
      "issueType votes latitude longitude createdAt slaDeadline status riskValue locationName"
    );

    const enriched = await enrichIssuesWithRiskBatch(issues, weather);

    const headers = [
      "id",
      "type",
      "location",
      "riskScore",
      "riskLevel",
      "slaStatus",
      "slaDeadline",
      "createdAt",
      "votes",
      "latitude",
      "longitude",
    ];

    const rows = enriched.map(i => [
      i._id.toString(),
      i.issueType,
      i.locationName || "Unknown",
      i.finalRisk,
      i.riskLevel,
      i.slaStatus,
      i.slaDeadline ? new Date(i.slaDeadline).toISOString() : "",
      i.createdAt ? new Date(i.createdAt).toISOString() : "",
      i.votes,
      i.latitude,
      i.longitude,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    // Audit the CSV export operation
    await logAudit({
      userId: req.user ? req.user.id : null,
      email: req.user ? req.user.email : "Anonymous",
      role: req.user ? req.user.role : "Anonymous",
      action: "EXPORT_CSV",
      severity: "INFO",
      ipAddress: req.ip
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="civicguard_authority_export_${weather}_${Date.now()}.csv"`
    );
    res.status(200).send(csvContent);
  } catch (error) {
    console.error("AUTHORITY CSV EXPORT ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/* =====================================
   🔮 GET IMPACT SIMULATION
===================================== */
export const getImpactSimulation = async (req, res) => {
  try {
    const ids = (req.query.ids || "").split(",").filter(Boolean);
    const weather = req.query.weather || "clear";
    
    // Fetch only active issues with required fields
    const issues = await Issue.find({ isDeleted: { $ne: true } }).select(
      "issueType votes latitude longitude createdAt slaDeadline status riskValue locationName"
    );

    const enrichedIssues = await enrichIssuesWithRiskBatch(issues, weather);

    const activeIssues = enrichedIssues.filter(
      i => !["resolved", "invalid"].includes(i.status)
    );

    const currentCityRisk = Math.round(activeIssues.reduce((sum, i) => sum + i.finalRisk, 0) * 10) / 10;

    // Filter out selected issues to calculate projected risk
    const remainingIssues = activeIssues.filter(i => !ids.includes(i._id.toString()));

    const projectedCityRisk = Math.round(remainingIssues.reduce((sum, i) => sum + i.finalRisk, 0) * 10) / 10;

    let riskReduction = 0;
    if (currentCityRisk > 0) {
      riskReduction = Math.round(((currentCityRisk - projectedCityRisk) / currentCityRisk) * 100);
    }

    // Dynamic timeline and area simulations
    const remainingCounts = computeNearbyCounts(remainingIssues);
    const nearbyCounts = computeNearbyCounts(activeIssues);

    const remainingForecast = await getCityForecast(remainingIssues, weather, remainingCounts);
    const originalForecast = await getCityForecast(activeIssues, weather, nearbyCounts);

    const originalAreaForecasts = await getAreaForecasts(activeIssues, weather, nearbyCounts);
    const projectedAreaForecasts = await getAreaForecasts(remainingIssues, weather, remainingCounts);

    res.status(200).json({
      currentCityRisk,
      projectedCityRisk,
      riskReduction,
      originalForecast,
      remainingForecast,
      originalAreaForecasts,
      projectedAreaForecasts,
    });
  } catch (error) {
    console.error("AUTHORITY IMPACT SIMULATION ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

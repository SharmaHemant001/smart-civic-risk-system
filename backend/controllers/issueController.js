import Issue from "../models/Issue.js";
import { checkDuplicate } from "../services/duplicateService.js";
import { calculateRisk } from "../services/riskService.js";
import User from "../models/User.js";
import getLocationName from "../services/getLocationName.js"; // FIXED (default import)

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

/* =========================
   🚀 UPLOAD ISSUE
========================= */
export const uploadIssue = async (req, res) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  try {
    const { latitude, longitude, issueType } = req.body;

    const imageUrl = req.body.imageUrl || null;
    const uploadedImageData = req.file
      ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
      : null;

    if ((!imageUrl && !uploadedImageData) || !latitude || !longitude || !issueType) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // ✅ FETCH LOCATION NAME (SAFE)
    let locationName = "Unknown";
    try {
      locationName = await getLocationName(latitude, longitude);
    } catch(err) {
      console.log("location fetch failed",err.message);
    }

    const user = await User.findOne();

    // 🚫 LOW REPUTATION BLOCK
    if (user && user.reputationScore < -5) {
      return res.status(403).json({
        error: "Low reputation. Cannot report issues.",
      });
    }

    // 🔁 DUPLICATE CHECK
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
      if (
        locationName &&
        locationName !== "Unknown" &&
        (!existingIssue.locationName || existingIssue.locationName === "Unknown")
      ) {
        existingIssue.locationName = locationName;
      }
      const nearbyIssueCount = await getNearbyIssueCount(
        existingIssue.latitude,
        existingIssue.longitude,
        existingIssue._id
      );
      const updatedRisk = calculateRisk({
        issueType,
        votes: existingIssue.votes,
        nearbyIssueCount,
      });
      existingIssue.riskScore = updatedRisk.riskScore;
      existingIssue.riskValue = updatedRisk.riskValue;

      await existingIssue.save();

      return res.json({
        message: "Duplicate issue found, vote increased",
        issue: existingIssue,
      });
    }

    // 🆕 CREATE ISSUE
    const nearbyIssueCount = await getNearbyIssueCount(latitude, longitude);
    const initialRisk = calculateRisk({
      issueType,
      votes: 1,
      nearbyIssueCount,
    });

    const newIssue = await Issue.create({
      imageUrl: imageUrl || uploadedImageData,
      issueType,
      latitude,
      longitude,
      expiresAt,
      locationName,
      votes: 1,
      riskScore: initialRisk.riskScore,
      riskValue: initialRisk.riskValue,
      status: "pending",
      reportedBy: user ? user._id : null,
    });

    res.status(201).json(newIssue);

  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   📥 GET ISSUES
========================= */
export const getIssues = async (req, res) => {
  try {
    const issues = await Issue.find().sort({ createdAt: -1 });

    await Promise.all(
      issues.map(async (issue) => {
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
      })
    );

    res.json(issues);
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
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    issue.votes += 1;
    const nearbyIssueCount = await getNearbyIssueCount(
      issue.latitude,
      issue.longitude,
      issue._id
    );
    const updatedRisk = calculateRisk({
      issueType: issue.issueType,
      votes: issue.votes,
      nearbyIssueCount,
    });
    issue.riskScore = updatedRisk.riskScore;
    issue.riskValue = updatedRisk.riskValue;

    await issue.save();

    res.json(issue);
  } catch (error) {
    console.error("VOTE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

export const validateIssue = async (req, res) => {
  try {
    const { vote } = req.body;

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

    await issue.save();

    res.json({
      message:
        issue.status === "resolved"
          ? "Issue marked as resolved by community"
          : "Validation vote recorded",
      issue,
      threshold: COMMUNITY_RESOLUTION_THRESHOLD,
    });
  } catch (error) {
    console.error("VALIDATION ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   ?? UPDATE STATUS
========================= */
export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    if (issue.status === status || issue.status === "resolved") {
      return res.json(issue);
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

    await issue.save();

    res.json(issue);

  } catch (error) {
    console.error("STATUS UPDATE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getTopAreas = async (req, res) => {
  try {
    const topAreas = await Issue.aggregate([
      {
        $match: {
          locationName: { $nin: [null, "", "Unknown"] } // ✅ FIX
        }
      },
      {
        $group: {
          _id: "$locationName",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 3
      }
    ]);

    res.status(200).json(topAreas);

  } catch (error) {
    console.error("TOP AREAS ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};




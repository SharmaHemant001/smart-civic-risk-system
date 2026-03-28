import Issue from "../models/Issue.js";
import { checkDuplicate } from "../services/duplicateService.js";
import { calculateRisk } from "../services/riskService.js";
import User from "../models/User.js";
import getLocationName from "../services/getLocationName.js"; // ✅ FIXED (default import)

/* =========================
   🚀 UPLOAD ISSUE
========================= */
export const uploadIssue = async (req, res) => {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 48);

  try {
    const { latitude, longitude, issueType } = req.body;

    const imageUrl = req.body.imageUrl || null;

    // ✅ BASE URL
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const imagePath = req.file
      ? `${baseUrl}/${req.file.path.replace(/\\/g, "/")}`
      : null;

    if ((!imageUrl && !imagePath) || !latitude || !longitude || !issueType) {
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
      if (
        locationName &&
        locationName !== "Unknown" &&
        (!existingIssue.locationName || existingIssue.locationName === "Unknown")
      ) {
        existingIssue.locationName = locationName;
      }
      existingIssue.riskScore = calculateRisk(
        issueType,
        existingIssue.votes
      );

      await existingIssue.save();

      return res.json({
        message: "Duplicate issue found, vote increased",
        issue: existingIssue,
      });
    }

    // 🆕 CREATE ISSUE
    const riskScore = calculateRisk(issueType, 1);

    const newIssue = await Issue.create({
      imageUrl: imageUrl || imagePath,
      issueType,
      latitude,
      longitude,
      expiresAt,
      locationName,
      votes: 1,
      riskScore,
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
    issue.riskScore = calculateRisk(issue.issueType, issue.votes);

    await issue.save();

    res.json(issue);
  } catch (error) {
    console.error("VOTE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   🚗 UPDATE STATUS
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

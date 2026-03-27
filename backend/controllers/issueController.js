import Issue from "../models/Issue.js";
import { checkDuplicate } from "../services/duplicateService.js";
import { calculateRisk } from "../services/riskService.js";
import User from "../models/User.js";

// 🚀 UPLOAD ISSUE
export const uploadIssue = async (req, res) => {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 48);

  try {
    const { latitude, longitude, issueType } = req.body;

    const imageUrl = req.body.imageUrl || null;
    const imagePath = req.file
      ? `${BASE_URL}/${req.file.path}`
      : null;

    if ((!imageUrl && !imagePath) || !latitude || !longitude || !issueType) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // 🔍 TEMP USER
    const user = await User.findOne();

    // 🚫 BLOCK LOW REPUTATION USERS
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
      votes: 1,
      riskScore,
      status: "pending",
      reportedBy: user ? user._id : null, // ✅ FIXED
    });

    res.status(201).json(newIssue);

  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// 📥 GET ISSUES
export const getIssues = async (req, res) => {
  try {
    const issues = await Issue.find().sort({ createdAt: -1 }); // 🔥 FIX: latest first
    res.json(issues);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// 👍 VOTE
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
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// 🚗 UPDATE STATUS
export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    // ⛔ Prevent unnecessary updates
    if (issue.status === status) {
      return res.json(issue);
    }

    // ⛔ Prevent overriding resolved issues
    if (issue.status === "resolved") {
      return res.json(issue);
    }

    issue.status = status;

    if (status === "resolved") {
      issue.resolvedAt = new Date();

      // 🔥 UPDATE REPUTATION ON RESOLVE
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
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};
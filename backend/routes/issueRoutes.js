import express from "express";
import multer from "multer";
import Issue from "../models/Issue.js";

import {
  uploadIssue,
  getIssues,
  voteIssue,
  validateIssue,
  updateStatus,
  getStats,
  getTopAreas,
  getHomepageStats,
  deleteIssue,
  checkDuplicateReport,
  confirmIssue,
} from "../controllers/issueController.js";

import { validateUpload } from "../middleware/uploadMiddleware.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";
import { validateIssueUpload } from "../middleware/validationMiddleware.js";

const router = express.Router();

/* =========================
   ✅ MULTER SETUP
========================= */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

/* =========================
   📌 CORE ROUTES
========================= */

// 📤 Upload Issue
router.post("/upload", upload.single("image"), validateUpload, validateIssueUpload, uploadIssue);

// 🔍 Check Duplicate
router.get("/check-duplicate", checkDuplicateReport);

// 👍 Confirm Issue (Community Verification)
router.post("/:id/confirm", confirmIssue);

// 📥 Get All Issues
router.get("/", getIssues);

// 👍 Vote
router.post("/:id/vote", voteIssue);

// ✅ Community Validation
router.post("/:id/validate", validateIssue);

// 🚗 Update Status
router.patch("/:id/status", updateStatus);

// 🗑 Delete Issue (Soft Delete)
router.delete("/:id", protect, restrictTo("operator", "admin"), deleteIssue);


/* =========================
   🔥 FIX: TOP AREAS ROUTE
========================= */

router.get("/stats", getStats);
router.get("/top-areas", getTopAreas);
router.get("/homepage-stats", getHomepageStats);

/* =========================
   👍 UPVOTE
========================= */
router.post("/:id/upvote", async (req, res) => {
  try {
    const { id } = req.params;

    const issue = await Issue.findByIdAndUpdate(
      id,
      { $inc: { votes: 1 } },
      { new: true }
    );

    if (!issue) {
      return res.status(404).json({ error: "Issue not found" });
    }

    res.json(issue);

  } catch (err) {
    console.error("ROUTE ERROR:", err.message);
    res.status(500).json({ error: "Upvote failed" });
  }
});

export default router;

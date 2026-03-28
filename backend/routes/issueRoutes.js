import express from "express";
import multer from "multer";
import Issue from "../models/Issue.js";
import User from "../models/User.js";

import {
  uploadIssue,
  getIssues,
  voteIssue,
  updateStatus,
  getTopAreas,
} from "../controllers/issueController.js";

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
router.post("/upload", upload.single("image"), uploadIssue);

// 📥 Get All Issues
router.get("/", getIssues);

// 👍 Vote
router.post("/:id/vote", voteIssue);

// 🚗 Update Status
router.patch("/:id/status", updateStatus);

/* =========================
   🔥 FIX: TOP AREAS ROUTE
========================= */

// ✅ ADD THIS LINE (IMPORTANT)
router.get("/top-areas", getTopAreas);

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

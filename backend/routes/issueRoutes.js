import express from "express";
import multer from "multer";
import path from "path"; // ✅ ADD THIS
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
   ✅ FIXED MULTER SETUP
========================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname); // ✅ get extension
    cb(null, Date.now() + ext); // ✅ add extension
  },
});

const upload = multer({ storage });

/* =========================
   📌 CORE ROUTES
========================= */

// 📤 Upload Issue
router.post("/upload", upload.single("image"), uploadIssue);

// 📥 Get All Issues
router.get("/", getIssues);

// 👍 Basic Vote
router.post("/:id/vote", voteIssue);

// 🚗 Update Status
router.patch("/:id/status", updateStatus);

/* =========================
   🔥 ADVANCED FEATURES
========================= */

// 👍 UPVOTE
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
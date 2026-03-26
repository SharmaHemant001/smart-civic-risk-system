import express from "express";
import multer from "multer";
import Issue from "../models/Issue.js";
import User from "../models/User.js"; // ✅ FIXED

import {
  uploadIssue,
  getIssues,
  voteIssue,
  updateStatus,
} from "../controllers/issueController.js";

const router = express.Router();

// ✅ Multer setup
const upload = multer({ dest: "uploads/" });

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
    res.status(500).json({ error: "Upvote failed" }); // ✅ FIXED
  }
});


// ✔ VALIDATION
router.post("/:id/validate", async (req, res) => {
  try {
    const { vote } = req.body;
    const { id } = req.params;

    if (!vote) {
      return res.status(400).json({ error: "Vote required" }); // ✅ FIX
    }

    const issue = await Issue.findById(id);
    if (!issue) return res.status(404).json({ error: "Issue not found" });

    // ✅ COUNT VOTES
    if (vote === "yes") issue.validationVotes.yes++;
    if (vote === "no") issue.validationVotes.no++;

    // 🔥 VALIDATION LOGIC

    if (issue.validationVotes.no >= 5) {
      issue.status = "invalid";
    } else if (issue.validationVotes.yes >= 3) {
      issue.status = "resolved";
    } else if (
      issue.validationVotes.no >= 3 &&
      issue.validationVotes.no > issue.validationVotes.yes
    ) {
      issue.status = "pending";
    }

    // 🔥 REPUTATION FIX (SAFE)
    if (issue.reportedBy) {
      const user = await User.findById(issue.reportedBy);

      if (user) {
        if (issue.status === "resolved") {
          user.reputationScore += 1;
        }

        if (issue.status === "invalid") {
          user.reputationScore -= 2;
        }

        await user.save();
      }
    }

    await issue.save();
    res.json(issue);

  } catch (err) {
    console.error("🔥 VALIDATION ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


/* =========================
   🚗 ROUTE-BASED DETECTION
========================= */

// 📍 Distance function
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;

  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


// 🚗 FIND ISSUES ON ROUTE
router.post("/route", async (req, res) => {
  try {
    const { routeCoordinates } = req.body;

    if (!routeCoordinates?.length) {
      return res.status(400).json({ error: "No route provided" });
    }

    const issues = await Issue.find();

    const nearbyIssues = issues.filter((issue) => {
      return routeCoordinates.some((coord) => {
        const distance = getDistance(
          issue.latitude,
          issue.longitude,
          coord.lat,
          coord.lng
        );

        return distance < 0.1;
      });
    });

    res.json(nearbyIssues);

  } catch (err) {
    console.error("🔥 ROUTE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


/* =========================
   📊 AREA STATS (FIXED)
========================= */

router.get("/area-stats", async (req, res) => {
  try {
    const issues = await Issue.find();

    const areaMap = {};

    for (let issue of issues) {
      const key = `${Math.round(issue.latitude)},${Math.round(issue.longitude)}`;

      if (!areaMap[key]) areaMap[key] = 0;
      areaMap[key]++;
    }

    res.json(areaMap);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* =========================
   🚗 NEARBY ISSUES
========================= */

router.get("/nearby", async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: "Missing location" });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    const issues = await Issue.find({
      status: { $in: ["pending", "in-progress"] },
    });

    const nearbyIssues = issues
      .map((issue) => {
        const distance = getDistance(
          userLat,
          userLng,
          issue.latitude,
          issue.longitude
        );

        return { ...issue.toObject(), distance };
      })
      .filter((i) => i.distance < 20)
      .sort((a, b) => a.distance - b.distance);

    res.json(nearbyIssues);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
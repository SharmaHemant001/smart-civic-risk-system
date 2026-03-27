import express from "express";
import Issue from "../models/Issue.js";

const router = express.Router();

router.post("/generate-demo", async (req, res) => {
  try {
    const routePoints = [
      { lat: 28.6129, lng: 77.2295 },
      { lat: 28.6000, lng: 77.2400 },
      { lat: 28.5900, lng: 77.2600 },
      { lat: 28.5800, lng: 77.3000 },
      { lat: 28.6000, lng: 77.3500 },
      { lat: 28.6300, lng: 77.3700 },
    ];

    const types = ["pothole", "garbage", "sewer", "construction"];

    await Issue.deleteMany({}); // optional reset

    const created = [];

    for (let p of routePoints) {
      const issue = await Issue.create({
        latitude: p.lat + (Math.random() - 0.5) * 0.01,
        longitude: p.lng + (Math.random() - 0.5) * 0.01,
        issueType: types[Math.floor(Math.random() * types.length)],
        imageUrl: "https://via.placeholder.com/300",
        votes: Math.floor(Math.random() * 10),
        riskScore: ["Low", "Medium", "High"][
          Math.floor(Math.random() * 3)
        ],
        status: "pending",
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      });

      created.push(issue);
    }

    res.json({ message: "Demo data generated", count: created.length });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
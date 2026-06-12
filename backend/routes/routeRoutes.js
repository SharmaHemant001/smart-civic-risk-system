import express from "express";
import { analyzeRouteRisk } from "../services/routeRiskService.js";
import { body, validationResult } from "express-validator";
import RouteHistory from "../models/RouteHistory.js";

const router = express.Router();

const validateRouteInput = [
  body("start.lat")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Start latitude must be between -90 and 90"),
  body("start.lon")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Start longitude must be between -180 and 180"),
  body("end.lat")
    .isFloat({ min: -90, max: 90 })
    .withMessage("End latitude must be between -90 and 90"),
  body("end.lon")
    .isFloat({ min: -180, max: 180 })
    .withMessage("End longitude must be between -180 and 180"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array().map(e => ({ field: e.path, message: e.msg })) });
    }
    next();
  }
];

router.post("/risk-analysis", validateRouteInput, async (req, res) => {
  try {
    const { start, end, startName, endName } = req.body;
    const result = await analyzeRouteRisk(start, end, startName, endName);
    res.status(200).json(result);
  } catch (error) {
    console.error("ROUTE RISK ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/frequent-destinations", async (req, res) => {
  try {
    const frequent = await RouteHistory.aggregate([
      {
        $match: {
          endName: { $exists: true, $ne: null, $ne: "" }
        }
      },
      {
        $group: {
          _id: "$endName",
          requestCount: { $sum: 1 },
          lastRequestedAt: { $max: "$timestamp" }
        }
      },
      {
        $sort: { requestCount: -1 }
      },
      {
        $limit: 6
      },
      {
        $project: {
          _id: 0,
          destination: "$_id",
          requestCount: 1,
          lastRequestedAt: 1
        }
      }
    ]);
    res.status(200).json(frequent);
  } catch (error) {
    console.error("GET FREQUENT DESTINATIONS ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

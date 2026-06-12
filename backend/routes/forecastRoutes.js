import express from "express";
import Issue from "../models/Issue.js";
import { calculateRiskAfterDays } from "../services/riskEngine.js";
import {
  computeNearbyCounts,
  getCityForecast,
  getAreaForecasts,
  getEmergingAlerts,
  getRecommendedInterventions,
} from "../services/forecastService.js";

import { protect, restrictTo } from "../middleware/authMiddleware.js";
import { validateIntervention } from "../middleware/validationMiddleware.js";

const router = express.Router();

// Only Managers and Admins can access forecasting tools
router.use(protect);
router.use(restrictTo("supervisor", "admin"));

// Helper: Fetch all active issues (status not resolved or invalid), ignoring soft-deleted
const getActiveIssues = async () => {
  return await Issue.find({
    status: { $nin: ["resolved", "invalid"] },
    isDeleted: { $ne: true }
  }).select("issueType votes latitude longitude createdAt slaDeadline status riskValue locationName");
};

/**
 * GET /api/authority/forecast/city
 * Returns city-wide risk forecasts and priority recommendations
 */
router.get("/city", async (req, res) => {
  try {
    const weather = req.query.weather || "clear";
    const activeIssues = await getActiveIssues();
    const nearbyCounts = computeNearbyCounts(activeIssues);

    const cityForecast = await getCityForecast(activeIssues, weather, nearbyCounts);
    
    // Calculate 30-day city risk for recommendations
    const cityRisk30d = cityForecast.forecasts["30d"].totalRisk;
    const recommendations = getRecommendedInterventions(activeIssues, weather, nearbyCounts, cityRisk30d);

    res.status(200).json({
      cityForecast,
      recommendations,
    });
  } catch (error) {
    console.error("FORECAST CITY ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/authority/forecast/areas
 * Returns area-by-area CRI forecasts
 */
router.get("/areas", async (req, res) => {
  try {
    const weather = req.query.weather || "clear";
    const activeIssues = await getActiveIssues();
    const nearbyCounts = computeNearbyCounts(activeIssues);

    const areaForecasts = await getAreaForecasts(activeIssues, weather, nearbyCounts);

    res.status(200).json(areaForecasts);
  } catch (error) {
    console.error("FORECAST AREAS ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/authority/forecast/alerts
 * Returns emerging risk alerts (CRI growth > 15 points in 7 days)
 */
router.get("/alerts", async (req, res) => {
  try {
    const weather = req.query.weather || "clear";
    const activeIssues = await getActiveIssues();
    const nearbyCounts = computeNearbyCounts(activeIssues);

    const areaForecasts = await getAreaForecasts(activeIssues, weather, nearbyCounts);
    const alerts = getEmergingAlerts(areaForecasts);

    res.status(200).json(alerts);
  } catch (error) {
    console.error("FORECAST ALERTS ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/authority/forecast/intervention
 * Simulates risk reduction after resolving selected issues
 */
router.post("/intervention", validateIntervention, async (req, res) => {
  try {
    const { ids = [], weather = "clear" } = req.body;
    const activeIssues = await getActiveIssues();
    const nearbyCounts = computeNearbyCounts(activeIssues);

    // Compute original 30-day city risk
    const originalForecast = await getCityForecast(activeIssues, weather, nearbyCounts);
    const originalCityRisk30d = originalForecast.forecasts["30d"].totalRisk;

    // Filter remaining issues
    const remainingIssues = activeIssues.filter(i => !ids.includes(i._id.toString()));
    const remainingCounts = computeNearbyCounts(remainingIssues);

    // Compute projected forecasts
    const cityForecast = await getCityForecast(remainingIssues, weather, remainingCounts);
    const areaForecasts = await getAreaForecasts(remainingIssues, weather, remainingCounts);
    const alerts = getEmergingAlerts(areaForecasts);

    const projectedCityRisk30d = cityForecast.forecasts["30d"].totalRisk;

    // Calculate expected risk reduction
    let improvement = 0;
    if (originalCityRisk30d > 0) {
      improvement = Math.round(((originalCityRisk30d - projectedCityRisk30d) / originalCityRisk30d) * 100);
    }

    res.status(200).json({
      originalCityRisk30d,
      projectedCityRisk30d,
      improvement,
      cityForecast,
      areaForecasts,
      alerts,
    });
  } catch (error) {
    console.error("FORECAST INTERVENTION ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/authority/forecast/heatmap
 * Returns heatmap dataset with dynamic hotspot evolution (Priority 4)
 */
router.get("/heatmap", async (req, res) => {
  try {
    const weather = req.query.weather || "clear";
    const day = parseInt(req.query.day) || 0; // offset in days: 0, 7, 14, 30
    
    const activeIssues = await getActiveIssues();
    const nearbyCounts = computeNearbyCounts(activeIssues);

    const heatmapData = [];

    activeIssues.forEach((issue) => {
      const nearbyCount = nearbyCounts[issue._id.toString()] || 0;
      const risk = calculateRiskAfterDays(issue, day, "clear", nearbyCount);
      let intensity = Math.max(0.1, Math.min(1.0, risk.finalRisk / 100));
      
      // Apply weather multipliers to forecast heatmap points
      let weatherMultiplier = 1.0;
      const lowerWeather = weather.toLowerCase();
      if (lowerWeather === "rain" && ["pothole", "sewer", "construction", "other"].includes(issue.issueType)) {
        weatherMultiplier = 1.25;
      } else if (lowerWeather === "heat" && ["garbage", "construction", "other"].includes(issue.issueType)) {
        weatherMultiplier = 1.18;
      }
      intensity = Math.min(1.0, intensity * weatherMultiplier);

      // Add base point
      heatmapData.push([issue.latitude, issue.longitude, intensity]);

      // Dynamic hotspot growth simulation (Priority 4)
      // If day > 0, generate simulated surrounding growth points based on location density
      if (day > 0) {
        const growthCount = Math.min(3, Math.floor(day / 7)); // 1 for 7d, 2 for 14d, 3 for 30d
        for (let g = 1; g <= growthCount; g++) {
          // Determine spatial drift using a consistent pseudo-random pattern based on issue ID
          const angle = (parseInt(issue._id.toString().slice(-4), 16) % 360) + (g * 45);
          const rad = (angle * Math.PI) / 180;
          // Offset distance increases with day horizon (0.001 to 0.003 degrees, approx 100-300m)
          const distanceOffset = 0.0015 * g * (1 + (nearbyCount * 0.1));
          
          const growthLat = issue.latitude + Math.sin(rad) * distanceOffset;
          const growthLng = issue.longitude + Math.cos(rad) * distanceOffset;
          
          // Growth intensity peaks in areas of high density and adverse weather
          const growthIntensity = intensity * 0.65 * (1 / g) * (1 + (nearbyCount * 0.05));
          
          heatmapData.push([
            parseFloat(growthLat.toFixed(6)),
            parseFloat(growthLng.toFixed(6)),
            parseFloat(Math.min(1.0, growthIntensity).toFixed(3))
          ]);
        }
      }
    });

    res.status(200).json(heatmapData);
  } catch (error) {
    console.error("FORECAST HEATMAP ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;

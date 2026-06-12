/**
 * CivicGuard Predictive Civic Forecasting Test Suite
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import axios from "axios";
import {
  computeNearbyCounts,
  getCityForecast,
  getAreaForecasts,
  getEmergingAlerts,
  getRecommendedInterventions,
} from "../services/forecastService.js";
import Issue from "../models/Issue.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

dotenv.config();

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`❌ FAILED: ${message}`);
  }
  console.log(`✅ PASSED: ${message}`);
};

async function runTests() {
  try {
    console.log("=== STARTING PREDICTIVE FORECASTING TESTS ===\n");

    // Connect to database
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing");
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for Testing.");

    const activeIssues = await Issue.find({ status: { $nin: ["resolved", "invalid"] } });
    assert(activeIssues.length > 0, "Database must contain active issues to run forecasts");
    console.log(`Found ${activeIssues.length} active issues.`);

    const nearbyCounts = computeNearbyCounts(activeIssues);

    // 1. TEST: getCityForecast
    console.log("\n--- TEST 1: getCityForecast (SUM Formula) ---");
    {
      const forecast = await getCityForecast(activeIssues, "clear", nearbyCounts);
      assert(forecast.forecasts !== undefined, "Should return forecasts");
      assert(forecast.forecasts["0d"].totalRisk >= 0, "Today risk sum should be positive");
      assert(typeof forecast.forecasts["30d"].totalRisk === "number", "30d risk should be a number");
      assert(forecast.assumptions.weather === "Clear", "Assumptions weather should be Clear");
      assert(forecast.assumptions.activeIssues === activeIssues.length, "Assumptions active issues should match");
      console.log(`  City Risk Forecast: Today: ${forecast.forecasts["0d"].totalRisk} -> 30d: ${forecast.forecasts["30d"].totalRisk} (+${forecast.growthPercent}% growth)`);
    }

    // 2. TEST: getAreaForecasts
    console.log("\n--- TEST 2: getAreaForecasts (Normalized CRI) ---");
    {
      const areaForecasts = await getAreaForecasts(activeIssues, "clear", nearbyCounts);
      assert(Array.isArray(areaForecasts), "Should return an array");
      assert(areaForecasts.length > 0, "Should have area records");
      
      const first = areaForecasts[0];
      assert(first.area !== undefined, "Area name should be present");
      assert(first.currentCRI >= 0 && first.currentCRI <= 100, `CRI must be normalized 0-100 (got ${first.currentCRI})`);
      assert(first.explanation.includes("projected to rise"), "Explanation should match template");
      assert(Array.isArray(first.drivers), "Drivers should be an array of explainable strings");
      console.log(`  Top Area Forecast: ${first.area} CRI today: ${first.currentCRI} -> 30d: ${first.forecast30Days} (${first.explanation})`);
    }

    // 3. TEST: getEmergingAlerts
    console.log("\n--- TEST 3: getEmergingAlerts (Spikes > 15 CRI points) ---");
    {
      const areaForecasts = await getAreaForecasts(activeIssues, "clear", nearbyCounts);
      const alerts = getEmergingAlerts(areaForecasts);
      assert(Array.isArray(alerts), "Alerts should be an array");
      
      alerts.forEach(alert => {
        assert(alert.forecastCRI - alert.currentCRI > 15, "Spike alert must only trigger if growth > 15 points");
        assert(alert.drivers.length > 0, "Alert must contain explainable drivers list");
      });
      console.log(`  Spike alerts triggered: ${alerts.length}`);
    }

    // 4. TEST: getRecommendedInterventions
    console.log("\n--- TEST 4: getRecommendedInterventions (Planner Presets) ---");
    {
      const cityForecast = await getCityForecast(activeIssues, "clear", nearbyCounts);
      const cityRisk30d = cityForecast.forecasts["30d"].totalRisk;
      const recs = getRecommendedInterventions(activeIssues, "clear", nearbyCounts, cityRisk30d);
      
      assert(recs.length === 3, "Should return exactly 3 recommended sets (Top 5, 10, 20)");
      assert(recs[0].name === "Recommended Top 5", "First should be Top 5");
      assert(recs[0].expectedReduction > 0, "Top 5 reduction should be positive");
      assert(recs[2].expectedReduction >= recs[0].expectedReduction, "Top 20 reduction should be greater than or equal to Top 5");
    }

    // 4.5 TEST: Weather Impacts & Explanation Generation
    console.log("\n--- TEST 4.5: Weather Impacts & Explanation Generation ---");
    {
      // Weather Impacts: Compare city forecast risk in Clear vs Rain
      const forecastClear = await getCityForecast(activeIssues, "clear", nearbyCounts);
      const forecastRain = await getCityForecast(activeIssues, "rain", nearbyCounts);
      
      assert(forecastRain.forecasts["30d"].totalRisk >= forecastClear.forecasts["30d"].totalRisk, "Rain risk should be >= Clear risk due to weather factors");
      console.log(`  Weather impact verified: 30d risk is ${forecastClear.forecasts["30d"].totalRisk} (Clear) vs ${forecastRain.forecasts["30d"].totalRisk} (Rain)`);
      
      // Explanation Generation: check that getAreaForecasts produces explanations and drivers
      const areaForecastsClear = await getAreaForecasts(activeIssues, "clear", nearbyCounts);
      const sampleArea = areaForecastsClear[0];
      assert(sampleArea.explanation !== undefined, "Explanation must be defined");
      assert(sampleArea.drivers.length > 0, "Drivers list should not be empty");
      
      // Check if explanation contains the drivers
      sampleArea.drivers.forEach(driver => {
        assert(sampleArea.explanation.includes(driver), `Explanation must include driver: "${driver}"`);
      });
      console.log(`  Explanation generation verified: Drivers matched the explanation string.`);
    }

    // 5. TEST: HTTP Route Endpoints (End-to-End)
    console.log("\n--- TEST 5: HTTP End-to-End Route Endpoint Projections ---");
    const express = (await import("express")).default;
    const forecastRoutes = (await import("../routes/forecastRoutes.js")).default;
    
    // Create Manager user for E2E testing
    const testEmail = "forecastManager@example.com";
    await User.deleteMany({ email: testEmail });
    const managerUser = await User.create({
      authProviderId: "mock-forecast-uid",
      displayName: "Forecast Manager",
      email: testEmail,
      role: "supervisor"
    });
    const jwtSecret = process.env.JWT_SECRET || "fallback_access_secret_key_12345!";
    const token = jwt.sign({ uid: "mock-forecast-uid", role: managerUser.role, email: managerUser.email }, jwtSecret);

    const app = express();
    app.use(express.json());
    app.use("/api/authority/forecast", forecastRoutes);
    
    const server = app.listen(3010);
    console.log("Temporary forecast server listening on port 3010.");

    try {
      const authHeader = { headers: { Authorization: `Bearer ${token}` } };

      // 5.1 GET /city
      {
        const res = await axios.get("http://localhost:3010/api/authority/forecast/city?weather=clear", authHeader);
        assert(res.status === 200, "GET /city should return HTTP 200");
        assert(res.data.cityForecast !== undefined, "Should contain cityForecast object");
        assert(res.data.recommendations.length === 3, "Should contain recommendations presets");
      }

      // 5.2 GET /areas
      {
        const res = await axios.get("http://localhost:3010/api/authority/forecast/areas?weather=clear", authHeader);
        assert(res.status === 200, "GET /areas should return HTTP 200");
        assert(Array.isArray(res.data), "GET /areas body should be an array");
      }

      // 5.3 GET /alerts
      {
        const res = await axios.get("http://localhost:3010/api/authority/forecast/alerts?weather=clear", authHeader);
        assert(res.status === 200, "GET /alerts should return HTTP 200");
        assert(Array.isArray(res.data), "GET /alerts body should be an array");
      }

      // 5.4 POST /intervention
      {
        const top3Issues = activeIssues.slice(0, 3).map(i => i._id.toString());
        const res = await axios.post("http://localhost:3010/api/authority/forecast/intervention", {
          ids: top3Issues,
          weather: "clear"
        }, authHeader);
        assert(res.status === 200, "POST /intervention should return HTTP 200");
        assert(res.data.originalCityRisk30d > 0, "Original risk should be positive");
        assert(res.data.projectedCityRisk30d <= res.data.originalCityRisk30d, "Projected risk must be less than or equal to original risk");
        assert(res.data.improvement >= 0, "Improvement percent should be positive or zero");
        console.log(`  Simulation: Original 30d: ${res.data.originalCityRisk30d} -> Projected 30d: ${res.data.projectedCityRisk30d} (-${res.data.improvement}% improvement)`);
      }

      // 5.5 GET /heatmap
      {
        const res = await axios.get("http://localhost:3010/api/authority/forecast/heatmap?day=30&weather=clear", authHeader);
        assert(res.status === 200, "GET /heatmap should return HTTP 200");
        assert(Array.isArray(res.data), "GET /heatmap body should be an array");
        if (res.data.length > 0) {
          const pt = res.data[0];
          assert(pt.length === 3, "Heatmap point must contain [latitude, longitude, intensity]");
          assert(pt[2] >= 0.1 && pt[2] <= 1.0, `Intensity must be scaled in [0.1, 1.0] (got ${pt[2]})`);
        }
      }
    } finally {
      server.close();
      console.log("Temporary forecast server closed.");
      await User.deleteMany({ email: testEmail });
    }

    await mongoose.disconnect();
    console.log("\n==================================================");
    console.log("✅ ALL FORECASTING SYSTEM TESTS PASSED SUCCESSFULLY");
    console.log("==================================================");
  } catch (error) {
    console.error("❌ Test failed:", error.stack);
    try {
      await mongoose.disconnect();
    } catch (_) {}
    process.exit(1);
  }
}

runTests();

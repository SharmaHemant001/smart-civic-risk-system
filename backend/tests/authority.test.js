/**
 * CivicGuard Authority Command Center Test Suite
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import {
  getStats,
  getIssues,
  getAreas,
  getAnalytics,
  bulkUpdate,
  exportCsv,
  getImpactSimulation,
} from "../controllers/authorityController.js";
import Issue from "../models/Issue.js";

dotenv.config();

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`❌ FAILED: ${message}`);
  }
  console.log(`✅ PASSED: ${message}`);
};

const mockRes = () => {
  const res = {};
  res.statusCode = 200;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  res.setHeader = (name, value) => {
    res.headers = res.headers || {};
    res.headers[name] = value;
  };
  res.send = (content) => {
    res.body = content;
    return res;
  };
  return res;
};

async function runTests() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing");
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for Testing.");

    // Fetch initial state to verify database is populated
    const count = await Issue.countDocuments();
    assert(count > 0, "Database must contain seeded issues before running tests");

    console.log(`\nFound ${count} seeded issues in the database.`);

    // 1. TEST: getStats
    console.log("\n--- TEST 1: GET Stats ---");
    {
      const req = { query: { weather: "clear" } };
      const res = mockRes();
      await getStats(req, res);
      assert(res.statusCode === 200, "getStats should return HTTP 200");
      assert(res.body.totalIssues === count, `Total issues count should equal DB count (got ${res.body.totalIssues})`);
      assert(res.body.cityRiskIndex >= 0 && res.body.cityRiskIndex <= 100, `City Risk Index must be normalized between 0-100 (got ${res.body.cityRiskIndex})`);
      console.log(`  Summary Stats: Total: ${res.body.totalIssues}, Critical: ${res.body.criticalIssues}, Breached: ${res.body.breachedSlaIssues}, CRI: ${res.body.cityRiskIndex}`);
    }

    // 2. TEST: getIssues and SLA Sorting
    console.log("\n--- TEST 2: GET Issues & SLA Sorting ---");
    {
      const req = { query: { weather: "clear" } };
      const res = mockRes();
      await getIssues(req, res);
      assert(res.statusCode === 200, "getIssues should return HTTP 200");
      assert(Array.isArray(res.body), "getIssues response body should be an array");

      // Verify default sorting: Breached SLA first, then risk value desc
      let breachedFoundAfterNonBreached = false;
      let previousRisk = 100;
      let nonBreachedEncountered = false;

      res.body.forEach(issue => {
        assert(issue.slaDeadline !== undefined, "Enriched issue must contain slaDeadline");
        assert(["OK", "Warning", "Breached"].includes(issue.slaStatus), "Enriched issue must contain valid slaStatus");
        
        const isBreached = issue.slaStatus === "Breached" && !["resolved", "invalid"].includes(issue.status);

        if (isBreached) {
          assert(!nonBreachedEncountered, "Breached issues must be sorted before non-breached ones");
        } else {
          nonBreachedEncountered = true;
          // For non-breached issues, risk value should be descending
          assert(issue.finalRisk <= previousRisk, `Issues must be sorted by finalRisk descending within categories (got ${issue.finalRisk} after ${previousRisk})`);
          previousRisk = issue.finalRisk;
        }
      });
      console.log(`  Issues count: ${res.body.length}. Sorting rules successfully validated.`);
    }

    // 3. TEST: getAreas (CRI calculation)
    console.log("\n--- TEST 3: GET Areas (CRI Calculation) ---");
    {
      const req = { query: { weather: "clear" } };
      const res = mockRes();
      await getAreas(req, res);
      assert(res.statusCode === 200, "getAreas should return HTTP 200");
      assert(Array.isArray(res.body), "getAreas response body should be an array");

      res.body.forEach(area => {
        assert(area.rank !== undefined, "Area ranking must contain rank");
        assert(area.area !== undefined, "Area ranking must contain area name");
        assert(area.cri >= 0 && area.cri <= 100, `CRI must be normalized 0-100 (got ${area.cri} for ${area.area})`);
        assert(area.trend !== undefined, "Area ranking must contain a trend value");
      });

      console.log(`  Top Area: #${res.body[0].rank} ${res.body[0].area} (CRI: ${res.body[0].cri}, Trend: ${res.body[0].trend})`);
    }

    // 4. TEST: getAnalytics
    console.log("\n--- TEST 4: GET Analytics ---");
    {
      const req = { query: { weather: "clear" } };
      const res = mockRes();
      await getAnalytics(req, res);
      assert(res.statusCode === 200, "getAnalytics should return HTTP 200");
      assert(res.body.summary !== undefined, "Analytics response must contain a summary");
      assert(res.body.summary.openIssues !== undefined, "Summary must contain openIssues count");
      assert(res.body.summary.resolutionRate >= 0 && res.body.summary.resolutionRate <= 100, "Resolution rate must be a percentage");
      assert(Array.isArray(res.body.dailyTrend), "dailyTrend must be an array");
      assert(res.body.dailyTrend.length === 30, `dailyTrend array must cover exactly 30 days (got ${res.body.dailyTrend.length})`);
      console.log(`  Analytics summary open: ${res.body.summary.openIssues}, resolved: ${res.body.summary.resolvedIssues}, rate: ${res.body.summary.resolutionRate}%`);
    }

    // 5. TEST: getImpactSimulation
    console.log("\n--- TEST 5: GET Impact Simulation ---");
    {
      // Find 2 active issues to mock simulate resolving them
      const activeIssues = await Issue.find({ status: { $nin: ["resolved", "invalid"] } }).limit(2);
      assert(activeIssues.length >= 2, "Database must contain at least 2 active issues to test simulator");

      const ids = activeIssues.map(i => i._id.toString()).join(",");
      const req = { query: { ids, weather: "clear" } };
      const res = mockRes();

      await getImpactSimulation(req, res);
      assert(res.statusCode === 200, "getImpactSimulation should return HTTP 200");
      assert(res.body.currentCityRisk !== undefined, "Response must contain currentCityRisk");
      assert(res.body.projectedCityRisk !== undefined, "Response must contain projectedCityRisk");
      assert(res.body.riskReduction !== undefined, "Response must contain riskReduction percentage");
      assert(res.body.projectedCityRisk <= res.body.currentCityRisk, "Projected risk must be less than or equal to current risk");
      console.log(`  Simulation: Current: ${res.body.currentCityRisk} -> Projected: ${res.body.projectedCityRisk} (Reduction: ${res.body.riskReduction}%)`);
    }

    // 6. TEST: exportCsv
    console.log("\n--- TEST 6: GET Export CSV ---");
    {
      const req = { query: { weather: "clear" } };
      const res = mockRes();
      await exportCsv(req, res);
      assert(res.statusCode === 200, "exportCsv should return HTTP 200");
      assert(res.headers["Content-Type"] === "text/csv", `Content-Type must be text/csv (got ${res.headers["Content-Type"]})`);
      assert(res.body.includes("id,type,location,riskScore,riskLevel"), "CSV content must contain expected header fields");
      console.log("  CSV content generated successfully.");
    }

    // 7. TEST: bulkUpdate (Recalculate & In-Progress)
    console.log("\n--- TEST 7: POST Bulk Update ---");
    {
      const list = await Issue.find({ status: { $nin: ["resolved", "invalid"] } }).limit(2);
      const ids = list.map(i => i._id);

      const req = { body: { ids, action: "in-progress", weather: "clear" } };
      const res = mockRes();
      await bulkUpdate(req, res);

      assert(res.statusCode === 200, "bulkUpdate in-progress should return HTTP 200");

      const updatedIssues = await Issue.find({ _id: { $in: ids } });
      updatedIssues.forEach(issue => {
        assert(issue.status === "in-progress", "Bulk update should set status to in-progress");
      });
      console.log("  Bulk updates verified successfully.");
    }

    console.log("\n==================================================");
    console.log("✅ ALL AUTHORITY TESTS PASSED SUCCESSFULLY");
    console.log("==================================================");

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

runTests();

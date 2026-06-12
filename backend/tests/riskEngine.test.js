/**
 * RiskEngine Test Suite - Upgraded for Dynamic Risk Scoring
 */

import { 
  calculateRisk, 
  validateRiskInput, 
  getRiskConfig,
  compareByRisk,
  calculateRiskToday,
  calculateRiskAfterDays,
} from "../services/riskEngine.js";

// Test helper
const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`❌ FAILED: ${message}`);
  }
  console.log(`✅ PASSED: ${message}`);
};

/**
 * TEST SUITE 1: TimeFactor Escalation
 */
console.log("\n=== TEST SUITE 1: TimeFactor Escalation ===\n");

(() => {
  // Test: 0 days unresolved => factor = 1.0
  const result0 = calculateRisk({
    issueType: "pothole",
    votes: 0,
    nearbyIssueCount: 0,
    daysUnresolved: 0,
    weather: "clear"
  });
  assert(result0.timeFactor === 1.0, `0 days unresolved should have 1.0 TimeFactor (got ${result0.timeFactor})`);

  // Test: 15 days unresolved => factor = 1.5
  const result15 = calculateRisk({
    issueType: "pothole",
    votes: 0,
    nearbyIssueCount: 0,
    daysUnresolved: 15,
    weather: "clear"
  });
  assert(result15.timeFactor === 1.5, `15 days unresolved should have 1.5 TimeFactor (got ${result15.timeFactor})`);

  // Test: 30 days unresolved => factor = 2.0
  const result30 = calculateRisk({
    issueType: "pothole",
    votes: 0,
    nearbyIssueCount: 0,
    daysUnresolved: 30,
    weather: "clear"
  });
  assert(result30.timeFactor === 2.0, `30 days unresolved should have 2.0 TimeFactor (got ${result30.timeFactor})`);

  // Test: 60 days unresolved => factor = 2.0 (capped)
  const result60 = calculateRisk({
    issueType: "pothole",
    votes: 0,
    nearbyIssueCount: 0,
    daysUnresolved: 60,
    weather: "clear"
  });
  assert(result60.timeFactor === 2.0, `60 days unresolved should have 2.0 TimeFactor (got ${result60.timeFactor})`);
})();

/**
 * TEST SUITE 2: Weather Multipliers
 */
console.log("\n=== TEST SUITE 2: Weather Multipliers ===\n");

(() => {
  // Pothole + Rain => 1.4x
  const potholeClear = calculateRisk({ issueType: "pothole", votes: 0, nearbyIssueCount: 0, daysUnresolved: 0, weather: "clear" });
  const potholeRain = calculateRisk({ issueType: "pothole", votes: 0, nearbyIssueCount: 0, daysUnresolved: 0, weather: "rain" });
  assert(potholeRain.weatherFactor === 1.4, "Pothole in rain should have 1.4 weatherFactor");
  assert(potholeRain.finalRisk === Math.min(100, Math.round(potholeRain.baseRisk * 1.4)), "Pothole in rain risk should scale rain base risk by 1.4x");

  // Sewer + Rain => 1.5x
  const sewerClear = calculateRisk({ issueType: "sewer", votes: 0, nearbyIssueCount: 0, daysUnresolved: 0, weather: "clear" });
  const sewerRain = calculateRisk({ issueType: "sewer", votes: 0, nearbyIssueCount: 0, daysUnresolved: 0, weather: "rain" });
  assert(sewerRain.weatherFactor === 1.5, "Sewer in rain should have 1.5 weatherFactor");
  assert(sewerRain.finalRisk === Math.min(100, Math.round(sewerRain.baseRisk * 1.5)), "Sewer in rain risk should scale rain base risk by 1.5x");

  // Garbage + Heat => 1.3x
  const garbageClear = calculateRisk({ issueType: "garbage", votes: 0, nearbyIssueCount: 0, daysUnresolved: 0, weather: "clear" });
  const garbageHeat = calculateRisk({ issueType: "garbage", votes: 0, nearbyIssueCount: 0, daysUnresolved: 0, weather: "heat" });
  assert(garbageHeat.weatherFactor === 1.3, "Garbage in heat should have 1.3 weatherFactor");
  assert(garbageHeat.finalRisk === Math.min(100, Math.round(garbageHeat.baseRisk * 1.3)), "Garbage in heat risk should scale heat base risk by 1.3x");

  // Construction + Rain => 1.0x (unaffected)
  const constructionRain = calculateRisk({ issueType: "construction", votes: 0, nearbyIssueCount: 0, daysUnresolved: 0, weather: "rain" });
  assert(constructionRain.weatherFactor === 1.0, "Construction in rain should have 1.0 weatherFactor");
})();

/**
 * TEST SUITE 3: Timeline Projections
 */
console.log("\n=== TEST SUITE 3: Timeline Projections ===\n");

(() => {
  const issue = {
    issueType: "pothole",
    votes: 0,
    createdAt: new Date().toISOString(),
  };

  const result = calculateRiskToday(issue, "clear", 0);
  assert(result.timeline, "Output must contain a timeline object");
  assert(result.timeline.currentRisk === result.finalRisk, "Timeline currentRisk must equal finalRisk");
  assert(result.timeline.riskAfter7Days > result.finalRisk, "Risk after 7 days should be higher due to aging");
  assert(result.timeline.riskAfter14Days > result.timeline.riskAfter7Days, "Risk after 14 days should be higher than 7 days");

  console.log(`  Current: ${result.timeline.currentRisk} -> 7 Days: ${result.timeline.riskAfter7Days} -> 14 Days: ${result.timeline.riskAfter14Days}`);
})();

/**
 * TEST SUITE 4: Explainable Breakdown
 */
console.log("\n=== TEST SUITE 4: Explainable Breakdown ===\n");

(() => {
  const result = calculateRisk({
    issueType: "pothole",
    votes: 5,
    nearbyIssueCount: 2,
    daysUnresolved: 10,
    weather: "rain"
  });

  assert(result.breakdown, "Output must contain breakdown");
  assert(result.breakdown.severity === 33, `Severity contribution should be 33 (got ${result.breakdown.severity})`);
  assert(result.breakdown.frequency === 12, `Frequency contribution should be 12 (got ${result.breakdown.frequency})`);
  assert(result.breakdown.density === 9, `Density contribution should be 9 (got ${result.breakdown.density})`);
  assert(result.breakdown.persistence === 18, `Persistence contribution should be 18 (got ${result.breakdown.persistence})`);
  assert(result.breakdown.weather === 28, `Weather contribution should be 28 (got ${result.breakdown.weather})`);

  console.log("  Breakdown structure successfully verified");
})();

/**
 * TEST SUITE 5: Human-Readable Explanations
 */
console.log("\n=== TEST SUITE 5: Human-Readable Explanations ===\n");

(() => {
  const result = calculateRisk({
    issueType: "pothole",
    votes: 5,
    nearbyIssueCount: 2,
    daysUnresolved: 22,
    weather: "rain"
  });

  assert(result.explanation.includes("pothole"), "Explanation should contain issue type");
  assert(result.explanation.includes("unresolved for 22 days"), "Explanation should contain age text");
  assert(result.explanation.includes("rain conditions increase"), "Explanation should contain weather impact text");
  console.log(`  Explanation: "${result.explanation}"`);
})();

console.log("\n" + "=".repeat(50));
console.log("✅ ALL TESTS PASSED");
console.log("=".repeat(50));

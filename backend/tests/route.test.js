/**
 * CivicGuard Route Risk Intelligence Test Suite
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import axios from "axios";
import {
  getDistanceToSegment,
  getDistanceToRoute,
  analyzeRouteRisk
} from "../services/routeRiskService.js";
import Issue from "../models/Issue.js";
import RouteHistory from "../models/RouteHistory.js";

dotenv.config();

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`❌ FAILED: ${message}`);
  }
  console.log(`✅ PASSED: ${message}`);
};

// Mock axios.get
const originalGet = axios.get;

async function runTests() {
  try {
    console.log("=== STARTING ROUTE RISK INTELLIGENCE TESTS ===\n");

    // 1. TEST Distance Calculations
    console.log("--- TEST 1: Distance and Projection Mathematics ---");
    {
      const p1 = { lat: 28.6328, lon: 77.1896 };
      const a = { lat: 28.6328, lon: 77.1896 };
      const b = { lat: 28.6330, lon: 77.1900 };

      // Distance from point to segment endpoint (0 meters)
      const dist1 = getDistanceToSegment(p1, a, b);
      assert(Math.round(dist1) === 0, "Distance to segment start point should be 0m");

      // Perpendicular projection point
      const p2 = { lat: 28.6329, lon: 77.1898 }; // lies directly on the segment
      const dist2 = getDistanceToSegment(p2, a, b);
      assert(dist2 < 5, `Distance of online point should be very close to 0m (got ${dist2}m)`);

      // Distance to route polyline
      const routeCoords = [
        { lat: 28.6328, lon: 77.1896 },
        { lat: 28.6335, lon: 77.1910 },
        { lat: 28.6350, lon: 77.1930 }
      ];
      const pNear = { lat: 28.6335, lon: 77.1910 };
      const distNear = getDistanceToRoute(pNear, routeCoords);
      assert(Math.round(distNear) === 0, "Distance to polyline vertex should be 0m");

      const pFar = { lat: 28.7000, lon: 77.3000 };
      const distFar = getDistanceToRoute(pFar, routeCoords);
      assert(distFar > 1000, "Distance to far away polyline should be > 1000m");
    }

    // Connect to database
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing");
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("\nConnected to MongoDB for Database & Routing Integration Tests.");

    // Clean up any old test records
    await RouteHistory.deleteMany({ "startLocation.lat": 28.6328 });

    // Ensure we have active test issues
    // Clear out old test issues if any
    await Issue.deleteMany({ description: "Test route risk issue" });

    // Create a critical issue directly on Route A path (around 28.6335, 77.1910)
    const issueRouteA = await Issue.create({
      issueType: "sewer",
      description: "Test route risk issue",
      latitude: 28.6335,
      longitude: 77.1910,
      votes: 12, // 12 votes ensures dynamic score is Critical (>=80)
      riskScore: "Critical",
      riskValue: 80,
      status: "pending",
      locationName: "Connaught Place Test",
      imageUrl: "https://via.placeholder.com/150"
    });

    // Create a lower-risk issue directly on Route B path (around 28.6300, 77.1905)
    const issueRouteB = await Issue.create({
      issueType: "pothole",
      description: "Test route risk issue",
      latitude: 28.6300,
      longitude: 77.1905,
      votes: 1,
      riskScore: "Medium",
      riskValue: 30,
      status: "pending",
      locationName: "Barakhamba Test",
      imageUrl: "https://via.placeholder.com/150"
    });

    // Create a far away issue
    const issueFar = await Issue.create({
      issueType: "garbage",
      description: "Test route risk issue",
      latitude: 28.8000,
      longitude: 77.8000,
      votes: 1,
      riskScore: "Low",
      riskValue: 10,
      status: "pending",
      locationName: "Far Out Test",
      imageUrl: "https://via.placeholder.com/150"
    });

    // 2. TEST analyzeRouteRisk Integration
    console.log("\n--- TEST 2: analyzeRouteRisk Integration & Recommendation ---");
    {
      // Mock axios.get to return Route A (passing near issueRouteA) and Route B (passing near issueRouteB)
      axios.get = async (url) => {
        return {
          data: {
            routes: [
              {
                distance: 1200,
                duration: 350,
                geometry: {
                  type: "LineString",
                  coordinates: [
                    [77.1896, 28.6328],
                    [77.1910, 28.6335],
                    [77.1933, 28.5244]
                  ]
                }
              },
              {
                distance: 1500,
                duration: 450,
                geometry: {
                  type: "LineString",
                  coordinates: [
                    [77.1896, 28.6328],
                    [77.1905, 28.6300],
                    [77.1933, 28.5244]
                  ]
                }
              }
            ]
          }
        };
      };

      const start = { lat: 28.6328, lon: 77.1896 };
      const end = { lat: 28.5244, lon: 77.1933 };

      const originalFind = Issue.find;
      const mockQuery = {
        select: function() { return this; },
        then: function(resolve, reject) {
          resolve([issueRouteA, issueRouteB, issueFar]);
        }
      };
      Issue.find = () => mockQuery;

      let result;
      try {
        result = await analyzeRouteRisk(start, end);
      } finally {
        Issue.find = originalFind;
      }

      console.log("RESULT ROUTES:", JSON.stringify(result.routes, null, 2));

      assert(result.routes.length === 2, "Should analyze exactly 2 routes");
      
      const rA = result.routes[0];
      const rB = result.routes[1];

      assert(rA.routeId === "Route A", "First route should be Route A");
      assert(rB.routeId === "Route B", "Second route should be Route B");

      // Verify corridor filtering
      assert(rA.criticalIssues === 1, `Route A should have 1 critical issue in corridor (got ${rA.criticalIssues})`);
      assert(rA.routeRisk === 88, `Route A risk should be 88 (got ${rA.routeRisk})`);

      assert(rB.criticalIssues === 0, `Route B should have 0 critical issues in corridor (got ${rB.criticalIssues})`);
      assert(rB.routeRisk === 53, `Route B risk should be 53 (got ${rB.routeRisk})`);

      // Verify recommendation: Route B is safer (risk 53 < 88)
      assert(result.recommendedRoute === "Route B", `Should recommend Route B (got ${result.recommendedRoute})`);
      assert(rB.isRecommended === true, "Route B should have isRecommended = true");
      assert(rA.isRecommended === false, "Route A should have isRecommended = false");
      assert(rB.recommendationReason.includes("Route B reduces route risk by 40%"), `Recommendation reason should contain percentage reduction (got "${rB.recommendationReason}")`);

      // Verify RouteHistory record creation
      const savedHistory = await RouteHistory.findById(result.historyId);
      assert(savedHistory !== null, "RouteHistory document should be persisted in database");
      assert(savedHistory.recommendedRoute === "Route B", `Saved history should record Route B as recommended (got ${savedHistory.recommendedRoute})`);
      assert(savedHistory.routeB.routeRisk === 53, "Saved history should record Route B risk as 53");
      assert(savedHistory.riskReduction === 40, `Saved riskReduction should be 40% (got ${savedHistory.riskReduction})`);
    }

    // Clean up test database issues
    await Issue.deleteMany({ description: "Test route risk issue" });
    await RouteHistory.deleteMany({ "startLocation.lat": 28.6328 });

    console.log("\n✅ ALL ROUTE RISK INTELLIGENCE TESTS PASSED SUCCESSFULLY!");
  } catch (error) {
    console.error("\n🔥 TEST SUITE FAILURE:", error.message);
    process.exit(1);
  } finally {
    axios.get = originalGet;
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

runTests();

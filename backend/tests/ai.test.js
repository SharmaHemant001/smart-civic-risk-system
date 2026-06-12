/**
 * CivicGuard AI-Assisted Classification Test Suite
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import axios from "axios";
import { normalizeCategory } from "../services/aiClassificationService.js";
import { uploadIssue } from "../controllers/issueController.js";
import Issue from "../models/Issue.js";
import User from "../models/User.js";

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
  return res;
};

async function runTests() {
  try {
    console.log("=== STARTING AI ASSISTED CLASSIFICATION TESTS ===\n");

    // 1. TEST Category Normalization
    console.log("--- TEST 1: Category Normalization ---");
    assert(normalizeCategory("road crack") === "pothole", "road crack -> pothole");
    assert(normalizeCategory("road damage") === "pothole", "road damage -> pothole");
    assert(normalizeCategory("pothole cluster") === "pothole", "pothole cluster -> pothole");
    assert(normalizeCategory("POTHOLE") === "pothole", "Case insensitivity (POTHOLE -> pothole)");
    
    assert(normalizeCategory("trash") === "garbage", "trash -> garbage");
    assert(normalizeCategory("waste") === "garbage", "waste -> garbage");
    assert(normalizeCategory("garbage pile") === "garbage", "garbage pile -> garbage");
    
    assert(normalizeCategory("drain blockage") === "sewer", "drain blockage -> sewer");
    assert(normalizeCategory("drain overflow") === "sewer", "drain overflow -> sewer");
    assert(normalizeCategory("sewer leak") === "sewer", "sewer leak -> sewer");
    
    assert(normalizeCategory("road work") === "construction", "road work -> construction");
    assert(normalizeCategory("excavation") === "construction", "excavation -> construction");
    assert(normalizeCategory("construction zone") === "construction", "construction zone -> construction");
    assert(normalizeCategory("unknown_random_label") === null, "Unmapped category -> null");
    console.log("Category normalization successfully verified.");

    // Connect to database to test database saving behavior
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing");
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("\nConnected to MongoDB for Schema & Controller Tests.");

    // Create a mock user if one doesn't exist
    let user = await User.findOne();
    if (!user) {
      user = await User.create({ authProviderId: "mock-ai-uid", displayName: "Test User", email: "test@civicguard.gov", role: "citizen" });
    }

    // 2. TEST Schema Saving - Match Prediction
    console.log("\n--- TEST 2: Controller Issue Creation - Match Prediction ---");
    {
      const req = {
        body: {
          latitude: 28.6328 + Math.random() * 0.5,
          longitude: 77.1896 + Math.random() * 0.5,
          issueType: "pothole",
          severity: "Low",
          affectedArea: "Road",
          description: "Test AI pothole report",
          imageUrl: "https://via.placeholder.com/150",
          aiPrediction: "pothole",
          aiConfidence: 0.92,
          userCategory: "pothole",
        },
      };
      const res = mockRes();
      await uploadIssue(req, res);

      assert(res.statusCode === 201, "uploadIssue should return HTTP 201");
      const createdIssueId = res.body._id;
      
      const saved = await Issue.findById(createdIssueId);
      assert(saved !== null, "Issue should be saved in MongoDB");
      assert(saved.aiPrediction === "pothole", `aiPrediction should be 'pothole' (got '${saved.aiPrediction}')`);
      assert(saved.aiConfidence === 0.92, `aiConfidence should be 0.92 (got ${saved.aiConfidence})`);
      assert(saved.userCategory === "pothole", `userCategory should be 'pothole' (got '${saved.userCategory}')`);
      assert(saved.finalCategory === "pothole", `finalCategory should be 'pothole' (got '${saved.finalCategory}')`);
      assert(saved.predictionMatched === true, `predictionMatched should be true (got ${saved.predictionMatched})`);
      
      // Cleanup
      await Issue.findByIdAndDelete(createdIssueId);
    }

    // 3. TEST Schema Saving - Mismatched Prediction (Override)
    console.log("\n--- TEST 3: Controller Issue Creation - Mismatched Prediction (Override) ---");
    {
      const req = {
        body: {
          latitude: 28.6328 + Math.random() * 0.5,
          longitude: 77.1896 + Math.random() * 0.5,
          issueType: "sewer", // User overrode to sewer
          severity: "Medium",
          affectedArea: "Road",
          description: "Test override report",
          imageUrl: "https://via.placeholder.com/150",
          aiPrediction: "pothole", // AI predicted pothole
          aiConfidence: 0.88,
          userCategory: "sewer",
        },
      };
      const res = mockRes();
      await uploadIssue(req, res);

      assert(res.statusCode === 201, "uploadIssue should return HTTP 201");
      const createdIssueId = res.body._id;
      
      const saved = await Issue.findById(createdIssueId);
      assert(saved.aiPrediction === "pothole", "aiPrediction should remain 'pothole'");
      assert(saved.finalCategory === "sewer", "finalCategory should be 'sewer'");
      assert(saved.predictionMatched === false, `predictionMatched should be false (got ${saved.predictionMatched})`);
      
      // Cleanup
      await Issue.findByIdAndDelete(createdIssueId);
    }

    // 4. TEST Schema Saving - AI Fail / Missing Parameters (Optional AI Flow)
    console.log("\n--- TEST 4: Optional AI Flow (AI Parameters Missing) ---");
    {
      const req = {
        body: {
          latitude: 28.6328 + Math.random() * 0.5,
          longitude: 77.1896 + Math.random() * 0.5,
          issueType: "construction",
          severity: "High",
          affectedArea: "Road",
          description: "Manual report without AI",
          imageUrl: "https://via.placeholder.com/150",
        },
      };
      const res = mockRes();
      await uploadIssue(req, res);

      assert(res.statusCode === 201, "uploadIssue should return HTTP 201");
      const createdIssueId = res.body._id;
      
      const saved = await Issue.findById(createdIssueId);
      assert(saved.aiPrediction === null, "aiPrediction should be null");
      assert(saved.aiConfidence === null, "aiConfidence should be null");
      assert(saved.predictionMatched === null, "predictionMatched should be null");
      assert(saved.finalCategory === "construction", "finalCategory should be 'construction'");
      
      // Cleanup
      await Issue.findByIdAndDelete(createdIssueId);
    }

    // 5. TEST: End-to-End Route POST /api/ai/classify
    console.log("\n--- TEST 5: End-to-End Route POST /api/ai/classify ---");
    const express = (await import("express")).default;
    const aiRoutes = (await import("../routes/aiRoutes.js")).default;
    
    const app = express();
    app.use(express.json());
    app.use("/api/ai", aiRoutes);
    
    const server = app.listen(3009);
    console.log("Temporary server listening on port 3009.");
    
    try {
      // Test case 5.1: pothole.jpg (High Confidence Auto-select)
      {
        const res = await axios.post("http://localhost:3009/api/ai/classify", {
          imageUrl: "https://example.com/pothole.jpg"
        });
        assert(res.status === 200, "Should return HTTP 200");
        assert(res.data.prediction === "pothole", `Should predict 'pothole' (got '${res.data.prediction}')`);
        assert(res.data.confidence === 0.92, `Confidence should be 0.92 (got ${res.data.confidence})`);
        console.log("  pothole.jpg route simulation passed.");
      }

      // Test case 5.2: garbage_low_confidence.jpg (Low Confidence manual override)
      {
        const res = await axios.post("http://localhost:3009/api/ai/classify", {
          imageUrl: "https://example.com/garbage_low_confidence.jpg"
        });
        assert(res.status === 200, "Should return HTTP 200");
        assert(res.data.prediction === "garbage", `Should predict 'garbage' (got '${res.data.prediction}')`);
        assert(res.data.confidence === 0.54, `Confidence should be 0.54 (got ${res.data.confidence})`);
        console.log("  garbage_low_confidence.jpg route simulation passed.");
      }

      // Test case 5.3: error_fail.jpg (Graceful failure)
      {
        try {
          await axios.post("http://localhost:3009/api/ai/classify", {
            imageUrl: "https://example.com/error_fail.jpg"
          });
          assert(false, "Route should fail and throw for error_fail.jpg");
        } catch (err) {
          assert(err.response.status === 500, `Should return HTTP 500 (got ${err.response.status})`);
          assert(err.response.data.status === "error", "Status should be 'error'");
          console.log("  error_fail.jpg route simulation passed (failed gracefully).");
        }
      }
    } finally {
      server.close();
      console.log("Temporary server closed.");
    }

    await mongoose.disconnect();
    console.log("\n==================================================");
    console.log("✅ ALL AI SERVICE TESTS PASSED SUCCESSFULLY");
    console.log("==================================================");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    try {
      await mongoose.disconnect();
    } catch (_) {}
    process.exit(1);
  }
}

runTests();

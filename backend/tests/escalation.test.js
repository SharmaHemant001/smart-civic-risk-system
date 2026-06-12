/**
 * CivicGuard Live Escalation Alerts Test Suite
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { checkEscalationEvents } from "../services/escalationService.js";
import Issue from "../models/Issue.js";
import EscalationEvent from "../models/EscalationEvent.js";

dotenv.config();

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`❌ FAILED: ${message}`);
  }
  console.log(`✅ PASSED: ${message}`);
};

async function runTests() {
  try {
    console.log("=== STARTING LIVE ESCALATION ALERTS TESTS ===\n");

    // Connect to database
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing");
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for Testing.");

    // Helper to clear test issues and events
    const cleanUp = async () => {
      await Issue.deleteMany({ locationName: { $regex: /Test Location/ } });
      await EscalationEvent.deleteMany({ clusterId: { $regex: /Test Location/ } });
    };

    await cleanUp();

    // 1. TEST: Less than 3 reports in 1 hour
    console.log("\n--- TEST 1: Under Threshold Reports (< 3 issues) ---");
    {
      const now = new Date();
      // Create 2 new issues
      await Issue.create([
        {
          issueType: "pothole",
          description: "Test under threshold 1",
          latitude: 28.6328,
          longitude: 77.1896,
          votes: 1,
          status: "pending",
          locationName: "Test Location A",
          createdAt: now,
          imageUrl: "https://via.placeholder.com/150"
        },
        {
          issueType: "pothole",
          description: "Test under threshold 2",
          latitude: 28.6329,
          longitude: 77.1897,
          votes: 1,
          status: "pending",
          locationName: "Test Location A",
          createdAt: now,
          imageUrl: "https://via.placeholder.com/150"
        }
      ]);

      const events = await checkEscalationEvents();
      assert(events.length === 0, "No escalation events should be triggered for Test Location A");
      
      const savedEvents = await EscalationEvent.find({ clusterId: "Test Location A" });
      assert(savedEvents.length === 0, "No EscalationEvent should be saved in DB for Test Location A");
    }

    // 2. TEST: 3+ reports in 1 hour (Triggers Escalation)
    console.log("\n--- TEST 2: Triggering Escalation (>= 3 issues) ---");
    {
      const now = new Date();
      // Create 3 new issues in Location B
      await Issue.create([
        {
          issueType: "sewer",
          description: "Test trigger 1",
          latitude: 28.6300,
          longitude: 77.1900,
          votes: 1,
          status: "pending",
          locationName: "Test Location B",
          createdAt: now,
          imageUrl: "https://via.placeholder.com/150"
        },
        {
          issueType: "garbage",
          description: "Test trigger 2",
          latitude: 28.6301,
          longitude: 77.1901,
          votes: 1,
          status: "pending",
          locationName: "Test Location B",
          createdAt: now,
          imageUrl: "https://via.placeholder.com/150"
        },
        {
          issueType: "pothole",
          description: "Test trigger 3",
          latitude: 28.6302,
          longitude: 77.1902,
          votes: 1,
          status: "pending",
          locationName: "Test Location B",
          createdAt: now,
          imageUrl: "https://via.placeholder.com/150"
        }
      ]);

      const events = await checkEscalationEvents();
      assert(events.length === 1, `Exactly 1 event should be triggered (got ${events.length})`);
      
      const event = events[0];
      assert(event.clusterId === "Test Location B", "Event clusterId should be Test Location B");
      assert(event.issueCount === 3, `Event issueCount should be 3 (got ${event.issueCount})`);
      assert(event.status === "Critical", `With no old risk, increase is 100%, status should be Critical (got ${event.status})`);
      assert(event.trendDirection === "Increasing", "Trend direction should be Increasing");

      const saved = await EscalationEvent.findOne({ clusterId: "Test Location B" });
      assert(saved !== null, "EscalationEvent should be saved in MongoDB");
      assert(saved.status === "Critical", "Saved event status should be Critical");
    }

    // 3. TEST: Anti-spam check (within 1 hour window)
    console.log("\n--- TEST 3: Anti-Spam Control ---");
    {
      // Call again. Since Test Location B already has an event in the last hour, it should skip it.
      const events = await checkEscalationEvents();
      assert(events.length === 0, "Subsequent check should trigger 0 new events due to anti-spam");
      
      const count = await EscalationEvent.countDocuments({ clusterId: "Test Location B" });
      assert(count === 1, `Total events in DB for Location B should still be 1 (got ${count})`);
    }

    // 4. TEST: Severity Level Threshold Mappings (Info, Warning, Critical)
    console.log("\n--- TEST 4: Alert Severity Level Mappings ---");
    {
      const now = new Date();
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

      // --- SCENARIO 4A: Risk growth < 10% => Info Alert
      // We create 16 old issues with 20 votes (each risk = 100, total = 1600)
      // We create 3 new garbage issues with 0 votes (each risk = 48, total = 144)
      // Growth: (144 / 1600) * 100 = 9% (< 10% => Info)
      const oldIssuesInfo = [];
      for (let i = 0; i < 16; i++) {
        oldIssuesInfo.push({
          issueType: "sewer",
          description: "Old issue C",
          latitude: 28.6400 + i * 0.0001,
          longitude: 77.2000 + i * 0.0001,
          votes: 20,
          status: "pending",
          locationName: "Test Location C-Info",
          createdAt: twoHoursAgo,
          imageUrl: "https://via.placeholder.com/150"
        });
      }
      await Issue.create(oldIssuesInfo);

      await Issue.create([
        {
          issueType: "garbage",
          description: "New issue C1",
          latitude: 28.6410,
          longitude: 77.2010,
          votes: 0,
          status: "pending",
          locationName: "Test Location C-Info",
          createdAt: now,
          imageUrl: "https://via.placeholder.com/150"
        },
        {
          issueType: "garbage",
          description: "New issue C2",
          latitude: 28.6411,
          longitude: 77.2011,
          votes: 0,
          status: "pending",
          locationName: "Test Location C-Info",
          createdAt: now,
          imageUrl: "https://via.placeholder.com/150"
        },
        {
          issueType: "garbage",
          description: "New issue C3",
          latitude: 28.6412,
          longitude: 77.2012,
          votes: 0,
          status: "pending",
          locationName: "Test Location C-Info",
          createdAt: now,
          imageUrl: "https://via.placeholder.com/150"
        }
      ]);

      const eventsInfo = await checkEscalationEvents();
      const infoEvent = eventsInfo.find(e => e.clusterId === "Test Location C-Info");
      assert(infoEvent !== undefined, "Should trigger event for Location C-Info");
      assert(infoEvent.status === "Info", `Should be Info severity for < 10% growth (got ${infoEvent.status}, riskIncrease: ${infoEvent.riskIncrease}%)`);

      // --- SCENARIO 4B: Risk growth between 10% and 25% => Warning Alert
      // We create 8 old issues with 20 votes (each risk = 100, total = 800)
      // We create 3 new garbage issues with 0 votes (each risk = 48, total = 144)
      // Growth: (144 / 800) * 100 = 18% (Warning)
      const oldIssuesWarning = [];
      for (let i = 0; i < 8; i++) {
        oldIssuesWarning.push({
          issueType: "sewer",
          description: "Old issue D",
          latitude: 28.6500 + i * 0.0001,
          longitude: 77.2100 + i * 0.0001,
          votes: 20,
          status: "pending",
          locationName: "Test Location D-Warning",
          createdAt: twoHoursAgo,
          imageUrl: "https://via.placeholder.com/150"
        });
      }
      await Issue.create(oldIssuesWarning);

      await Issue.create([
        {
          issueType: "garbage",
          description: "New issue D1",
          latitude: 28.6510,
          longitude: 77.2110,
          votes: 0,
          status: "pending",
          locationName: "Test Location D-Warning",
          createdAt: now,
          imageUrl: "https://via.placeholder.com/150"
        },
        {
          issueType: "garbage",
          description: "New issue D2",
          latitude: 28.6511,
          longitude: 77.2111,
          votes: 0,
          status: "pending",
          locationName: "Test Location D-Warning",
          createdAt: now,
          imageUrl: "https://via.placeholder.com/150"
        },
        {
          issueType: "garbage",
          description: "New issue D3",
          latitude: 28.6512,
          longitude: 77.2112,
          votes: 0,
          status: "pending",
          locationName: "Test Location D-Warning",
          createdAt: now,
          imageUrl: "https://via.placeholder.com/150"
        }
      ]);

      const eventsWarning = await checkEscalationEvents();
      const warningEvent = eventsWarning.find(e => e.clusterId === "Test Location D-Warning");
      assert(warningEvent !== undefined, "Should trigger event for Location D-Warning");
      assert(warningEvent.status === "Warning", `Should be Warning severity for 10-25% growth (got ${warningEvent.status}, riskIncrease: ${warningEvent.riskIncrease}%)`);
    }

    // Clean up
    await cleanUp();

    console.log("\n✅ ALL LIVE ESCALATION ALERT TESTS PASSED SUCCESSFULLY!");
  } catch (error) {
    console.error("\n🔥 TEST SUITE FAILURE:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

runTests();

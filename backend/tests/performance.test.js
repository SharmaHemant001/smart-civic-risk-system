import mongoose from "mongoose";
import dotenv from "dotenv";
import Issue from "../models/Issue.js";

dotenv.config({ path: "./.env" });

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/civicguard";

const runPerformanceTest = async () => {
  try {
    console.log("🔌 Connecting to Database...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Database Connected");

    const issueCount = await Issue.countDocuments({});
    if (issueCount < 5000) {
      console.log(`⚠️ Warning: Only ${issueCount} issues found in DB. For best results, run the load test seed first: node seeds/loadTestSeed.js`);
    } else {
      console.log(`📊 Found ${issueCount} issues to run performance tests on.`);
    }

    const testQueries = [
      {
        name: "Spatial Query (issues near Bangalore center)",
        query: () => Issue.find({
          location: {
            $nearSphere: {
              $geometry: {
                type: "Point",
                coordinates: [77.5946, 12.9716]
              },
              $maxDistance: 5000 // 5km
            }
          }
        }).limit(100)
      },
      {
        name: "Compound Query (pending & Critical issues)",
        query: () => Issue.find({
          status: "pending",
          riskScore: "Critical"
        })
      },
      {
        name: "Sorted Query (active issues sorted by date)",
        query: () => Issue.find({
          status: { $nin: ["resolved", "invalid"] }
        }).sort({ createdAt: -1 }).limit(100)
      },
      {
        name: "Type Filtering Query (garbage issues sorted by risk value)",
        query: () => Issue.find({
          issueType: "garbage"
        }).sort({ riskValue: -1 }).limit(100)
      }
    ];

    // Measure time helper
    const measureTime = async (fn, iterations = 5) => {
      const times = [];
      for (let i = 0; i < iterations; i++) {
        const start = process.hrtime.bigint();
        await fn();
        const end = process.hrtime.bigint();
        times.push(Number(end - start) / 1_000_000); // convert to ms
      }
      // Return average time, discarding the first run (cold start / cache heating)
      if (times.length > 1) {
        const activeTimes = times.slice(1);
        return activeTimes.reduce((a, b) => a + b, 0) / activeTimes.length;
      }
      return times[0];
    };

    console.log("\n--- STAGE 1: Drop indexes & measure performance (NO INDEX) ---");
    // Get list of indexes to recreate them later
    const indexesBeforeDrop = await Issue.collection.indexes();
    console.log("Current indexes:", indexesBeforeDrop.map(idx => idx.name));

    // Drop all indexes except _id_
    try {
      await Issue.collection.dropIndexes();
      console.log("💥 Dropped all indexes on Issues collection.");
    } catch (err) {
      console.log("Indexes were already clean or error dropping:", err.message);
    }

    const unindexedResults = {};
    for (const test of testQueries) {
      console.log(`Running: ${test.name} ...`);
      try {
        const avgTime = await measureTime(test.query);
        unindexedResults[test.name] = avgTime;
        console.log(`   Average Time (No Index): ${avgTime.toFixed(2)} ms`);
      } catch (err) {
        console.error(`❌ Query failed without index:`, err.message);
        unindexedResults[test.name] = null;
      }
    }

    console.log("\n--- STAGE 2: Recreate indexes & measure performance (WITH INDEX) ---");
    console.log("🛠️ Re-building indexes on Issues collection...");
    // Let Mongoose handle the index rebuild automatically
    await Issue.syncIndexes();
    console.log("✅ Indexes successfully re-built.");

    const indexedResults = {};
    for (const test of testQueries) {
      console.log(`Running: ${test.name} ...`);
      try {
        const avgTime = await measureTime(test.query);
        indexedResults[test.name] = avgTime;
        console.log(`   Average Time (Indexed): ${avgTime.toFixed(2)} ms`);
      } catch (err) {
        console.error(`❌ Query failed with index:`, err.message);
        indexedResults[test.name] = null;
      }
    }

    console.log("\n=======================================================");
    console.log("       📊 PERFORMANCE COMPARISON REPORT               ");
    console.log("=======================================================");
    console.log(
      String("Query Name").padEnd(45) +
      String("No Index (ms)").padStart(15) +
      String("Indexed (ms)").padStart(15) +
      String("Speedup").padStart(12)
    );
    console.log("-".repeat(87));

    for (const test of testQueries) {
      const noIdx = unindexedResults[test.name];
      const withIdx = indexedResults[test.name];
      
      let speedupStr = "N/A";
      if (noIdx !== null && withIdx !== null && withIdx > 0) {
        const ratio = noIdx / withIdx;
        speedupStr = `${ratio.toFixed(1)}x`;
      }

      console.log(
        test.name.padEnd(45) +
        (noIdx !== null ? noIdx.toFixed(2) : "FAILED").padStart(15) +
        (withIdx !== null ? withIdx.toFixed(2) : "FAILED").padStart(15) +
        speedupStr.padStart(12)
      );
    }
    console.log("=======================================================\n");

    process.exit(0);
  } catch (error) {
    console.error("🔥 Error running performance test:", error);
    process.exit(1);
  }
};

runPerformanceTest();

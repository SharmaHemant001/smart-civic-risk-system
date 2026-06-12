import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Issue from "../models/Issue.js";

dotenv.config({ path: "./.env" });

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/civicguard";

const seedLoadTestData = async () => {
  try {
    console.log("🔌 Connecting to Database...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Database Connected");

    console.log("🧹 Cleaning existing users and issues...");
    // Only clean test users/issues to avoid deleting production seed data if any, 
    // or just clear User and Issue entirely for load test.
    await User.deleteMany({});
    await Issue.deleteMany({});
    console.log("✅ Tables cleared");

    console.log("🔑 Hashing default password once...");
    const passwordHash = await bcrypt.hash("Password123!", 10);

    console.log("👤 Generating 500 users...");
    const users = [];
    const roles = ["Citizen", "FieldCrew", "Dispatcher", "Manager", "Admin"];
    
    for (let i = 1; i <= 500; i++) {
      let role = "Citizen";
      if (i > 450 && i <= 475) role = "FieldCrew";
      else if (i > 475 && i <= 490) role = "Dispatcher";
      else if (i > 490 && i <= 498) role = "Manager";
      else if (i > 498) role = "Admin";

      users.push({
        name: `Test User ${i}`,
        email: `testuser${i}@example.com`,
        password: passwordHash,
        role: role,
        reputationScore: Math.floor(Math.random() * 20) - 5, // -5 to 15
        isDeleted: false
      });
    }

    const insertedUsers = await User.insertMany(users);
    console.log(`✅ Inserted ${insertedUsers.length} users`);

    const userIds = insertedUsers.map(u => u._id);

    console.log("🚗 Generating 10,000 issues...");
    const issues = [];
    const issueTypes = ["pothole", "sewer", "garbage", "construction"];
    const statuses = ["pending", "in-progress", "resolved", "invalid", "need-review"];
    const riskScores = ["Low", "Medium", "High", "Critical"];

    // Base coordinates around Bangalore (12.9716, 77.5946)
    const baseLat = 12.9716;
    const baseLon = 77.5946;

    for (let i = 1; i <= 10000; i++) {
      const latOffset = (Math.random() - 0.5) * 0.1; // +/- 0.05 degrees (approx 5.5km)
      const lonOffset = (Math.random() - 0.5) * 0.1;
      const lat = parseFloat((baseLat + latOffset).toFixed(6));
      const lon = parseFloat((baseLon + lonOffset).toFixed(6));
      
      const votes = Math.floor(Math.random() * 30);
      const isDeleted = Math.random() < 0.02; // 2% soft-deleted
      
      const issueType = issueTypes[Math.floor(Math.random() * issueTypes.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const riskScore = riskScores[Math.floor(Math.random() * riskScores.length)];
      const riskValue = Math.floor(Math.random() * 100);

      const createdDate = new Date();
      createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 60)); // up to 60 days ago

      const resolvedDate = status === "resolved" ? new Date(createdDate.getTime() + Math.random() * 5 * 24 * 3600 * 1000) : null;
      
      issues.push({
        imageUrl: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2",
        issueType,
        description: `Generated load test issue number ${i}`,
        createdAt: createdDate,
        expiresAt: new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        latitude: lat,
        longitude: lon,
        location: {
          type: "Point",
          coordinates: [lon, lat] // [longitude, latitude]
        },
        locationName: `Bangalore Zone ${Math.floor(Math.random() * 10) + 1}`,
        votes,
        status,
        riskScore,
        riskValue,
        resolvedAt: resolvedDate,
        reportedBy: userIds[Math.floor(Math.random() * userIds.length)],
        isDeleted
      });
    }

    // Insert in chunks of 2000 to keep memory low
    const chunkSize = 2000;
    for (let i = 0; i < issues.length; i += chunkSize) {
      const chunk = issues.slice(i, i + chunkSize);
      await Issue.insertMany(chunk);
      console.log(`   ... inserted issues ${i + chunk.length}/10000`);
    }

    console.log("✅ Successfully seeded 10,000 issues and 500 users!");
    process.exit(0);
  } catch (error) {
    console.error("🔥 Error seeding load test database:", error);
    process.exit(1);
  }
};

seedLoadTestData();

import mongoose from "mongoose";
import dotenv from "dotenv";
import Issue from "../models/Issue.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { calculateRisk } from "../services/riskEngine.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// Delhi neighborhoods and coordinates (realistic lat/long)
const DELHI_LOCATIONS = [
  { name: "Connaught Place", lat: 28.6328, lng: 77.1896 },
  { name: "Saket", lat: 28.5244, lng: 77.1933 },
  { name: "DLF Cyber City", lat: 28.4595, lng: 77.1085 },
  { name: "Indirapuram", lat: 28.6176, lng: 77.0655 },
  { name: "Noida City Center", lat: 28.5921, lng: 77.3635 },
  { name: "Vasant Kunj", lat: 28.5168, lng: 77.1998 },
  { name: "Lajpat Nagar", lat: 28.5644, lng: 77.2389 },
  { name: "Karol Bagh", lat: 28.6505, lng: 77.2028 },
  { name: "Greater Kailash", lat: 28.5244, lng: 77.2477 },
  { name: "Rajouri Garden", lat: 28.6659, lng: 77.0826 },
  { name: "Rohini", lat: 28.7501, lng: 77.0373 },
  { name: "Dwarka", lat: 28.5921, lng: 77.0460 },
  { name: "Shalimar Bagh", lat: 28.7614, lng: 77.1316 },
  { name: "Pitampura", lat: 28.7368, lng: 77.1186 },
  { name: "Malviya Nagar", lat: 28.5199, lng: 77.2013 },
  { name: "Munirka", lat: 28.5134, lng: 77.1889 },
  { name: "Lodi Road", lat: 28.6032, lng: 77.2202 },
  { name: "Aerocity", lat: 28.5721, lng: 77.1093 },
  { name: "Delhi Cantt", lat: 28.6430, lng: 77.1334 },
  { name: "Golf Course Road", lat: 28.5505, lng: 77.1771 },
];

const ISSUE_TYPES = ["pothole", "garbage", "sewer", "construction"];

const STATUSES = ["pending", "in-progress", "resolved", "need-review"];

// Generate realistic issue descriptions
const getDescription = (issueType, locationName) => {
  const descriptions = {
    pothole: [
      `Large pothole on ${locationName} main road causing vehicle damage`,
      `Deep crater on the street affecting traffic flow at ${locationName}`,
      `Dangerous pothole on ${locationName} highway - immediate repair needed`,
      `Road damaged with multiple potholes near ${locationName}`,
    ],
    garbage: [
      `Overflowing garbage pile at ${locationName} - creates health hazard`,
      `Waste accumulation blocking pedestrian path at ${locationName}`,
      `Illegal dumping site established near ${locationName}`,
      `Street cleanliness issue at ${locationName} - garbage not collected`,
    ],
    sewer: [
      `Sewer overflow at ${locationName} - water logging on road`,
      `Drainage system blocked at ${locationName} causing stagnant water`,
      `Foul smell from open sewer at ${locationName}`,
      `Sewer line rupture causing damage at ${locationName}`,
    ],
    construction: [
      `Unsafe construction site at ${locationName} - debris on road`,
      `Construction waste blocking traffic at ${locationName}`,
      `Unfinished construction causing congestion at ${locationName}`,
      `Unauthorized building activity at ${locationName}`,
    ],
  };

  return descriptions[issueType][
    Math.floor(Math.random() * descriptions[issueType].length)
  ];
};

// Generate random dates in the last 30 days
const getRandomDate = () => {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 30);
  const hoursAgo = Math.floor(Math.random() * 24);
  return new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - hoursAgo * 60 * 60 * 1000);
};

// Generate random votes and validation
const getRandomVotes = () => {
  return {
    votes: Math.floor(Math.random() * 50),
    validationYes: Math.floor(Math.random() * 30),
    validationNo: Math.floor(Math.random() * 10),
  };
};

// Generate seed data
const generateSeedIssues = () => {
  const issues = [];

  for (let i = 0; i < 150; i++) {
    const location =
      DELHI_LOCATIONS[Math.floor(Math.random() * DELHI_LOCATIONS.length)];
    const issueType = ISSUE_TYPES[Math.floor(Math.random() * ISSUE_TYPES.length)];
    const votes = getRandomVotes();
    const createdAt = getRandomDate();
    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];

    const issue = {
      imageUrl: `https://via.placeholder.com/400x300?text=${issueType}+${i}`,
      issueType,
      description: getDescription(issueType, location.name),
      latitude: location.lat + (Math.random() - 0.5) * 0.01,
      longitude: location.lng + (Math.random() - 0.5) * 0.01,
      locationName: location.name,
      votes: votes.votes,
      validationVotes: {
        yes: votes.validationYes,
        no: votes.validationNo,
      },
      status,
      createdAt,
      expiresAt: new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000),
      resolvedAt: status === "resolved" ? new Date(createdAt.getTime() + Math.random() * 10 * 24 * 60 * 60 * 1000) : null,
    };

    issues.push(issue);
  }

  // Calculate risk using centralized RiskEngine based on in-memory state
  issues.forEach((issue, idx) => {
    // Count active nearby issues in the seeded data (excluding resolved/invalid)
    const nearbyIssueCount = issues.filter((other, otherIdx) => {
      if (idx === otherIdx) return false;
      if (other.status === "resolved" || other.status === "invalid") return false;

      const latDiff = Math.abs(other.latitude - issue.latitude);
      const lonDiff = Math.abs(other.longitude - issue.longitude);
      // Matching LOCATION_RISK_RADIUS = 0.02
      return latDiff <= 0.02 && lonDiff <= 0.02;
    }).length;

    const risk = calculateRisk({
      issueType: issue.issueType,
      votes: issue.votes,
      nearbyIssueCount,
    });

    issue.riskScore = risk.riskLevel;
    issue.riskValue = risk.finalRisk;

    // SLA Calculation
    const slaDurationHours = {
      Critical: 24,
      High: 72,
      Medium: 72,
      Low: 72,
    }[risk.riskLevel] || 72;
    issue.slaDeadline = new Date(issue.createdAt.getTime() + slaDurationHours * 60 * 60 * 1000);
  });

  return issues;
};

// Seed database
export const seedDatabase = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("❌ MONGO_URI not defined in .env");
    }

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Seed default Admin and Manager users if they don't already exist
    const adminEmail = "admin@civicguard.gov";
    const managerEmail = "manager@civicguard.gov";

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash("Password123!", 10);
      await User.create({
        name: "Development Admin",
        email: adminEmail,
        password: passwordHash,
        role: "Admin",
      });
      console.log("👤 Seeded development admin account");
    }

    const existingManager = await User.findOne({ email: managerEmail });
    if (!existingManager) {
      const passwordHash = await bcrypt.hash("Password123!", 10);
      await User.create({
        name: "Development Manager",
        email: managerEmail,
        password: passwordHash,
        role: "Manager",
      });
      console.log("👤 Seeded development manager account");
    }

    // Check if data already exists
    const existingCount = await Issue.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  Database already contains ${existingCount} issues`);
      console.log("To reset, run: npm run seed:reset");
      await mongoose.disconnect();
      return;
    }

    // Generate and insert seed data
    const seedIssues = generateSeedIssues();
    const result = await Issue.insertMany(seedIssues);
    console.log(`✅ Successfully seeded ${result.length} issues to database`);

    // Log statistics
    const byType = await Issue.aggregate([
      { $group: { _id: "$issueType", count: { $sum: 1 } } },
    ]);
    const byStatus = await Issue.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const byRisk = await Issue.aggregate([
      { $group: { _id: "$riskScore", count: { $sum: 1 } } },
    ]);

    console.log("\n📊 Seed Data Statistics:");
    console.log("By Issue Type:");
    byType.forEach((t) => console.log(`  - ${t._id}: ${t.count}`));
    console.log("\nBy Status:");
    byStatus.forEach((s) => console.log(`  - ${s._id}: ${s.count}`));
    console.log("\nBy Risk Score:");
    byRisk.forEach((r) => console.log(`  - ${r._id}: ${r.count}`));

    await mongoose.disconnect();
    console.log("\n✅ Seeding complete!");
  } catch (error) {
    console.error("🔥 Seeding failed:", error.message);
    process.exit(1);
  }
};

// Reset database
export const resetDatabase = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("❌ MONGO_URI not defined in .env");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const deletedCount = await Issue.deleteMany({});
    console.log(`✅ Deleted ${deletedCount.deletedCount} issues from database`);

    await mongoose.disconnect();
    console.log("✅ Database reset complete!");
  } catch (error) {
    console.error("🔥 Reset failed:", error.message);
    process.exit(1);
  }
};

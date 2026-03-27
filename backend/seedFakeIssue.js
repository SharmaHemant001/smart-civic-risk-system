console.log("🔥 Script started");
import mongoose from "mongoose";
import dotenv from "dotenv";
import Issue from "./models/Issue.js";

dotenv.config();

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ DB Connected");
};

// 📍 Route: India Gate → Noida
const routePoints = [
  { lat: 28.6129, lng: 77.2295 }, // India Gate
  { lat: 28.6000, lng: 77.2400 },
  { lat: 28.5900, lng: 77.2600 },
  { lat: 28.5800, lng: 77.3000 },
  { lat: 28.6000, lng: 77.3500 },
  { lat: 28.6300, lng: 77.3700 }, // Noida
];

const issueTypes = ["pothole", "garbage", "sewer", "construction"];

const seedData = async () => {
  try {
    await connectDB();

    for (let i = 0; i < routePoints.length; i++) {
      const point = routePoints[i];

      const randomType =
        issueTypes[Math.floor(Math.random() * issueTypes.length)];

      await Issue.create({
        latitude: point.lat,
        longitude: point.lng,
        issueType: randomType,
        imageUrl: "https://via.placeholder.com/300",
        votes: Math.floor(Math.random() * 10) + 1,
        riskScore: ["Low", "Medium", "High"][
          Math.floor(Math.random() * 3)
        ],
        status: "pending",
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      });

      console.log(`✅ Issue added at ${point.lat}, ${point.lng}`);
    }

    console.log("🎉 Fake data inserted successfully!");
    process.exit();

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedData();
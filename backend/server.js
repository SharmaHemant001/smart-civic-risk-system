import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cron from "node-cron";
import cors from "cors";

import issueRoutes from "./routes/issueRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import Issue from "./models/Issue.js";

dotenv.config({ path  : "./.env" });

console.log("MONGO_URI:", process.env.MONGO_URI);

const app = express();

/* =====================================
   ✅ CONNECT DATABASE (FIXED)
===================================== */
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("❌ MONGO_URI missing in .env");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("🔥 DB Connection Error:", error.message);
    process.exit(1);
  }
};

/* =====================================
   ✅ MIDDLEWARE
===================================== */
app.use(cors());

app.use(express.json());

/* =====================================
   ✅ ROUTES
===================================== */
app.use("/api/issues", issueRoutes);
app.use("/api/location", locationRoutes);

/* =====================================
   ✅ STATIC FILES
===================================== */
app.use("/uploads", express.static("uploads"));

/* =====================================
   ✅ HEALTH CHECK
===================================== */
app.get("/", (req, res) => {
  res.send("API Running 🚀");
});

/* =====================================
   ⏱ AUTO EXPIRY SYSTEM (FINAL)
===================================== */
cron.schedule("0 * * * *", async () => {
  console.log("⏱ Running auto-expiry job...");

  try {
    const now = new Date();

    const expiredIssues = await Issue.find({
      expiresAt: { $lt: now },
      status: { $in: ["pending", "in-progress"] },
    });

    for (let issue of expiredIssues) {
      if (issue.votes >= 10) {
        issue.status = "pending";
      } else if (issue.votes >= 5) {
        issue.status = "needs-review";
      } else {
        issue.status = "invalid";
      }

      await issue.save();
    }

    console.log(`✅ Expired issues processed: ${expiredIssues.length}`);

  } catch (err) {
    console.error("🔥 Cron Error:", err.message);
  }
});

/* =====================================
   🚀 START SERVER (AFTER DB CONNECT)
===================================== */
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB(); // 🔥 IMPORTANT FIX

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

startServer();
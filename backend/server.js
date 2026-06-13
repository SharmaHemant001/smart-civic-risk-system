import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cron from "node-cron";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";

import issueRoutes from "./routes/issueRoutes.js";
import authorityRoutes from "./routes/authorityRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import forecastRoutes from "./routes/forecastRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import Issue from "./models/Issue.js";
import User from "./models/User.js";
import routeRoutes from "./routes/routeRoutes.js";
import escalationRoutes from "./routes/escalationRoutes.js";


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
    // Do not call process.exit(1) so that the Render service can bind to its port and stay online
  }
};

/* =====================================
   ✅ MIDDLEWARE & SECURITY
===================================== */
app.use(helmet());
const allowedOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}
if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    // Match any local development origin with any port (e.g. localhost:3001, 127.0.0.1:3002)
    const isLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (allowedOrigins.includes(origin) || isLocal || origin.endsWith(".vercel.app")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: "10kb" }));

// Rate Limiters
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === "production" ? 100 : 1000,
  message: { error: "Too many requests. Please try again after an hour." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authorityLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 500,
  message: { error: "Authority rate limit exceeded. Please try again after an hour." },
  standardHeaders: true,
  legacyHeaders: false,
});

const publicLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  message: { error: "Too many requests from this IP. Please try again after an hour." },
  standardHeaders: true,
  legacyHeaders: false,
});

/* =====================================
   ✅ ROUTES
===================================== */
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/authority", authorityLimiter, authorityRoutes);
app.use("/api/authority/forecast", authorityLimiter, forecastRoutes);
app.use("/api/issues", publicLimiter, issueRoutes);
app.use("/api/ai", publicLimiter, aiRoutes);
app.use("/api/routes", publicLimiter, routeRoutes);
app.use("/api/escalations", publicLimiter, escalationRoutes);


/* =====================================
   ✅ STATIC FILES
===================================== */
import path from "path";

app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"))
);

/* =====================================
   ✅ OBSERVABILITY (HEALTH & METRICS)
===================================== */
app.get("/", (req, res) => {
  res.send("API Running 🚀");
});

app.get("/api/health", async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting"
  };
  
  const status = dbState === 1 ? "UP" : "DOWN";
  
  res.status(status === "UP" ? 200 : 503).json({
    status,
    uptime: process.uptime(),
    dbStatus: dbStatusMap[dbState] || "unknown",
    memoryUsage: process.memoryUsage(),
    timestamp: new Date()
  });
});

app.get("/api/metrics", async (req, res) => {
  try {
    const totalIssues = await Issue.collection.countDocuments({});
    const activeIssues = await Issue.collection.countDocuments({ isDeleted: { $ne: true } });
    const deletedIssues = await Issue.collection.countDocuments({ isDeleted: true });
    
    const totalUsers = await User.collection.countDocuments({});
    const activeUsers = await User.collection.countDocuments({ isDeleted: { $ne: true } });
    const deletedUsers = await User.collection.countDocuments({ isDeleted: true });
    
    const criticalIssues = await Issue.collection.countDocuments({
      isDeleted: { $ne: true },
      status: { $nin: ["resolved", "invalid"] },
      riskScore: "Critical"
    });
    
    const resolvedIssues = await Issue.collection.countDocuments({
      isDeleted: { $ne: true },
      status: "resolved"
    });

    res.status(200).json({
      uptime: process.uptime(),
      issues: {
        total: totalIssues,
        active: activeIssues,
        deleted: deletedIssues,
        critical: criticalIssues,
        resolved: resolvedIssues
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        deleted: deletedUsers
      },
      memory: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    });
  } catch (error) {
    console.error("METRICS ERROR:", error);
    res.status(500).json({ error: error.message });
  }
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

const startServer = () => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });

  connectDB();
};

startServer();
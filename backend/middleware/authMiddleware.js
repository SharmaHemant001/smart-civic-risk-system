import jwt from "jsonwebtoken";
import admin from "firebase-admin";
import User from "../models/User.js";

// Initialize Firebase Admin if projectId is set in environment variables
if (process.env.FIREBASE_PROJECT_ID) {
  if (!admin.apps.length) {
    try {
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      } else {
        admin.initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID
        });
      }
      console.log("🔥 Firebase Admin Initialized successfully");
    } catch (err) {
      console.error("❌ Firebase Admin Initialization error:", err);
    }
  }
}

// Middleware: Authenticate Request via Firebase ID Token
export const protect = async (req, res, next) => {
  try {
    let token = "";

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.headers.cookie) {
      const match = req.headers.cookie.match(/accessToken=([^;]+)/);
      if (match) token = match[1];
    }

    if (!token) {
      return res.status(401).json({ error: true, message: "Access denied. Not authenticated." });
    }

    // Intercept Demo Session access tokens
    if (token === "demo-operator" || token === "demo-supervisor" || token === "demo-admin") {
      const demoRole = token.replace("demo-", "");
      const decoded = {
        uid: `demo-${demoRole}-uid`,
        email: `demo-${demoRole}@civicguard.gov`,
        name: `Demo ${demoRole.charAt(0).toUpperCase() + demoRole.slice(1)}`,
        picture: "",
        role: demoRole
      };

      let user = await User.findOne({ authProviderId: decoded.uid, isDeleted: false });
      if (!user) {
        user = await User.create({
          authProviderId: decoded.uid,
          email: decoded.email,
          displayName: decoded.name,
          role: decoded.role,
          profilePhoto: decoded.picture,
          createdAt: new Date(),
          lastLogin: new Date()
        });
      } else {
        user.lastLogin = new Date();
        await user.save();
      }

      req.user = {
        id: user._id.toString(),
        authProviderId: user.authProviderId,
        email: user.email,
        role: user.role
      };
      return next();
    }

    let decoded = null;

    // 1. Check if it's a mock token signed by local JWT_SECRET for test environments
    const jwtSecret = process.env.JWT_SECRET || "fallback_access_secret_key_12345!";
    try {
      const verified = jwt.verify(token, jwtSecret);
      if (verified) {
        decoded = {
          uid: verified.uid || verified.id || "mock-uid-123",
          email: verified.email || "mock@example.com",
          name: verified.name || verified.displayName || "Mock User",
          picture: verified.picture || verified.profilePhoto || "",
          role: verified.role || "citizen"
        };
      }
    } catch (err) {
      // Not a mock token, will attempt Firebase Admin verification below
    }

    // 2. Fallback to Firebase Admin verification
    if (!decoded) {
      if (!admin.apps.length) {
        return res.status(401).json({ error: true, message: "Invalid or expired access token" });
      }
      try {
        const firebaseUser = await admin.auth().verifyIdToken(token);
        decoded = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.name || firebaseUser.displayName || "",
          picture: firebaseUser.picture || "",
          role: firebaseUser.role || "citizen"
        };
      } catch (err) {
        return res.status(401).json({ error: true, message: "Invalid or expired access token" });
      }
    }

    // 3. Find or auto-create User in MongoDB
    let user = await User.findOne({ authProviderId: decoded.uid, isDeleted: false });
    if (!user) {
      user = await User.create({
        authProviderId: decoded.uid,
        email: decoded.email,
        displayName: decoded.name || decoded.email.split("@")[0],
        role: decoded.role || "citizen",
        profilePhoto: decoded.picture || "",
        createdAt: new Date(),
        lastLogin: new Date()
      });
    } else {
      user.lastLogin = new Date();
      if (decoded.name && user.displayName !== decoded.name) {
        user.displayName = decoded.name;
      }
      if (decoded.picture && user.profilePhoto !== decoded.picture) {
        user.profilePhoto = decoded.picture;
      }
      await user.save();
    }

    req.user = {
      id: user._id.toString(),
      authProviderId: user.authProviderId,
      email: user.email,
      role: user.role
    };
    
    next();
  } catch (error) {
    console.error("AUTH MIDDLEWARE ERROR:", error);
    res.status(500).json({ error: true, message: error.message });
  }
};

// Middleware: Enforce Role-Based Access Control
export const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: true, message: "Not authenticated" });
    }

    // Dynamic role mapping to support legacy roles for backward compatibility
    const roleMapping = {
      "Citizen": "citizen",
      "FieldCrew": "operator",
      "Dispatcher": "operator",
      "Manager": "supervisor",
      "Admin": "admin",
      "citizen": "citizen",
      "operator": "operator",
      "supervisor": "supervisor",
      "admin": "admin"
    };

    const userRole = roleMapping[req.user.role] || req.user.role;
    const resolvedAllowedRoles = allowedRoles.map(role => roleMapping[role] || role);

    if (!resolvedAllowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: true,
        message: `Access denied. Role '${userRole}' does not have permission.` 
      });
    }

    next();
  };
};

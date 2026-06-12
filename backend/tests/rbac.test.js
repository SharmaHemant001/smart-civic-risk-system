import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

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
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing");
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for RBAC Testing.");

    // Create a mock user in DB to satisfy database check in protect()
    const testEmail = "rbactest@example.com";
    await User.deleteMany({ email: testEmail });
    const user = await User.create({
      authProviderId: "mock-rbac-uid",
      displayName: "RBAC Test User",
      email: testEmail,
      role: "operator"
    });

    const jwtSecret = process.env.JWT_SECRET || "fallback_access_secret_key_12345!";

    // 1. TEST: protect middleware - No Token
    console.log("\n--- TEST 1: protect middleware - No Token ---");
    {
      const req = { headers: {} };
      const res = mockRes();
      let nextCalled = false;
      await protect(req, res, () => { nextCalled = true; });
      
      assert(res.statusCode === 401, "Should return 401 when no token is present");
      assert(res.body.message === "Access denied. Not authenticated.", "Should return correct error message");
      assert(!nextCalled, "next() should not be called when unauthenticated");
    }

    // 2. TEST: protect middleware - Invalid Token
    console.log("\n--- TEST 2: protect middleware - Invalid Token ---");
    {
      const req = {
        headers: {
          authorization: "Bearer invalid_token_xyz"
        }
      };
      const res = mockRes();
      let nextCalled = false;
      await protect(req, res, () => { nextCalled = true; });

      assert(res.statusCode === 401, "Should return 401 when token is invalid");
      assert(res.body.message === "Invalid or expired access token", "Should return invalid token message");
      assert(!nextCalled, "next() should not be called with invalid token");
    }

    // 3. TEST: protect middleware - Valid Token
    console.log("\n--- TEST 3: protect middleware - Valid Token ---");
    {
      const token = jwt.sign({ uid: "mock-rbac-uid", role: user.role, email: user.email }, jwtSecret, { expiresIn: "5m" });
      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };
      const res = mockRes();
      let nextCalled = false;
      await protect(req, res, () => { nextCalled = true; });

      assert(res.statusCode === 200, "Should succeed with 200/next");
      assert(nextCalled, "next() should be called with valid token");
      assert(req.user.email === testEmail, "Should populate req.user.email correctly");
      assert(req.user.role === "operator", "Should populate req.user.role correctly");
    }

    // 4. TEST: restrictTo middleware - Denied Role
    console.log("\n--- TEST 4: restrictTo middleware - Denied Role ---");
    {
      const req = {
        user: {
          id: user._id.toString(),
          email: testEmail,
          role: "operator"
        }
      };
      const res = mockRes();
      let nextCalled = false;
      const middleware = restrictTo("supervisor", "admin");
      middleware(req, res, () => { nextCalled = true; });

      assert(res.statusCode === 403, "Should return 403 Forbidden when role is not authorized");
      assert(res.body.message.includes("Access denied"), "Should contain access denied error message");
      assert(!nextCalled, "next() should not be called when role is unauthorized");
    }

    // 5. TEST: restrictTo middleware - Allowed Role
    console.log("\n--- TEST 5: restrictTo middleware - Allowed Role ---");
    {
      const req = {
        user: {
          id: user._id.toString(),
          email: testEmail,
          role: "operator"
        }
      };
      const res = mockRes();
      let nextCalled = false;
      const middleware = restrictTo("operator", "admin");
      middleware(req, res, () => { nextCalled = true; });

      assert(res.statusCode === 200, "Should succeed with 200/next");
      assert(nextCalled, "next() should be called when role is authorized");
    }

    // Clean up
    await User.deleteMany({ email: testEmail });

    console.log("\n==================================================");
    console.log("✅ ALL RBAC MIDDLEWARE TESTS PASSED SUCCESSFULLY");
    console.log("==================================================");

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Test failed:", error.stack);
    process.exit(1);
  }
}

runTests();

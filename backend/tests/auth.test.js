import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { register, login, refresh, logout, getMe, forgotPassword, resetPassword } from "../controllers/authController.js";

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
  res.cookies = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  res.cookie = (name, value, options) => {
    res.cookies[name] = { value, options };
    return res;
  };
  res.clearCookie = (name) => {
    delete res.cookies[name];
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
    console.log("Connected to MongoDB for Firebase Auth Testing.");

    const testEmail = "firebaseauth@example.com";
    const testUid = "firebase-test-uid-12345";
    const jwtSecret = process.env.JWT_SECRET || "fallback_access_secret_key_12345!";

    // Clean up
    await User.deleteMany({ email: testEmail });
    await User.deleteMany({ authProviderId: testUid });

    // Generate mock Firebase JWT
    const mockToken = jwt.sign(
      {
        uid: testUid,
        email: testEmail,
        name: "Firebase Test User",
        picture: "https://example.com/photo.jpg",
        role: "citizen"
      },
      jwtSecret
    );

    // 1. TEST: User Registration
    console.log("\n--- TEST 1: Successful User Registration ---");
    {
      const req = {
        body: {
          idToken: mockToken,
          role: "citizen"
        }
      };
      const res = mockRes();
      await register(req, res);
      assert(res.statusCode === 201, "Should successfully register with 201");
      assert(res.body.user.email === testEmail, "Registered email should match");
      assert(res.body.user.role === "citizen", "Role should match");
      
      const user = await User.findOne({ authProviderId: testUid });
      assert(user !== null, "User should be persisted in database");
    }

    // 2. TEST: Reject Duplicate Registration
    console.log("\n--- TEST 2: Reject Duplicate Registration ---");
    {
      const req = {
        body: {
          idToken: mockToken
        }
      };
      const res = mockRes();
      await register(req, res);
      assert(res.statusCode === 400, "Should reject duplicate registration with 400");
      assert(res.body.message === "Email is already registered", "Should return correct error message");
    }

    // 3. TEST: Successful Login with existing user
    console.log("\n--- TEST 3: Successful Login ---");
    {
      const req = {
        body: {
          idToken: mockToken
        }
      };
      const res = mockRes();
      await login(req, res);
      assert(res.statusCode === 200, "Should login successfully with 200");
      assert(res.body.accessToken === mockToken, "Should return correct access token");
      assert(res.cookies.accessToken !== undefined, "Should set accessToken cookie");
      assert(res.body.user.email === testEmail, "User object email should match");
    }

    // 4. TEST: Login with new user (Auto-create account / Google Sign-In)
    console.log("\n--- TEST 4: Google Sign-In Auto-Account Creation ---");
    const newUid = "google-sign-in-uid-67890";
    const newEmail = "googlesignin@example.com";
    const newMockToken = jwt.sign(
      {
        uid: newUid,
        email: newEmail,
        name: "Google User",
        picture: "https://example.com/google.jpg",
        role: "citizen"
      },
      jwtSecret
    );
    {
      const req = {
        body: {
          idToken: newMockToken
        }
      };
      const res = mockRes();
      await login(req, res);
      assert(res.statusCode === 200, "Should login successfully with 200");
      assert(res.body.user.email === newEmail, "Should return auto-created user email");
      
      const newUser = await User.findOne({ authProviderId: newUid });
      assert(newUser !== null, "User should be auto-created in database");
      assert(newUser.displayName === "Google User", "Display name should be populated");
      assert(newUser.profilePhoto === "https://example.com/google.jpg", "Profile photo should be populated");
    }

    // 5. TEST: Token Refresh (Pass-through)
    console.log("\n--- TEST 5: Token Refresh (Pass-through) ---");
    {
      const req = {
        headers: {
          cookie: `accessToken=${mockToken}`
        },
        body: {}
      };
      const res = mockRes();
      await refresh(req, res);
      assert(res.statusCode === 200, "Should refresh successfully");
      assert(res.body.accessToken === mockToken, "Returned token should match");
    }

    // 6. TEST: User Logout
    console.log("\n--- TEST 6: User Logout ---");
    {
      const req = {};
      const res = mockRes();
      await logout(req, res);
      assert(res.statusCode === 200, "Logout should succeed with 200");
      assert(res.cookies.accessToken === undefined, "Should clear accessToken cookie");
    }

    // 7. TEST: Get Me
    console.log("\n--- TEST 7: Get Current User (getMe) ---");
    {
      const user = await User.findOne({ authProviderId: testUid });
      const req = {
        user: {
          id: user._id.toString(),
          authProviderId: testUid,
          email: testEmail,
          role: "citizen"
        }
      };
      const res = mockRes();
      await getMe(req, res);
      assert(res.statusCode === 200, "Should return current user details with 200");
      assert(res.body.authProviderId === testUid, "Payload authProviderId should match");
      assert(res.body.email === testEmail, "Payload email should match");
    }

    // 8. TEST: Forgot & Reset Password flows (Stub checks)
    console.log("\n--- TEST 8: Forgot & Reset Password stub check ---");
    {
      const reqForgot = { body: { email: testEmail } };
      const resForgot = mockRes();
      await forgotPassword(reqForgot, resForgot);
      assert(resForgot.statusCode === 200, "Forgot password should succeed");

      const reqReset = { body: { email: testEmail, token: "mock", password: "mock" } };
      const resReset = mockRes();
      await resetPassword(reqReset, resReset);
      assert(resReset.statusCode === 200, "Reset password should succeed");
    }

    // Clean up
    await User.deleteMany({ email: testEmail });
    await User.deleteMany({ email: newEmail });
    await User.deleteMany({ authProviderId: testUid });
    await User.deleteMany({ authProviderId: newUid });

    console.log("\n==================================================");
    console.log("✅ ALL FIREBASE AUTH TESTS PASSED SUCCESSFULLY");
    console.log("==================================================");

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Test failed:", error.stack);
    process.exit(1);
  }
}

runTests();

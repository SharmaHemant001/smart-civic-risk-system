import express from "express";
import dotenv from "dotenv";
import { 
  validateRegister, 
  validateLogin, 
  validateIssueUpload, 
  validateBulkUpdate,
  validateIntervention 
} from "../middleware/validationMiddleware.js";

dotenv.config();

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`❌ FAILED: ${message}`);
  }
  console.log(`✅ PASSED: ${message}`);
};

async function runTests() {
  let server;
  try {
    console.log("Starting express-validator Validation Tests via Express server...");

    const app = express();
    app.use(express.json());

    // Register routes for validation
    app.post("/register", validateRegister, (req, res) => res.status(200).json({ success: true }));
    app.post("/login", validateLogin, (req, res) => res.status(200).json({ success: true }));
    app.post("/upload", validateIssueUpload, (req, res) => res.status(200).json({ success: true }));
    app.post("/bulk-update", validateBulkUpdate, (req, res) => res.status(200).json({ success: true }));
    app.post("/intervention", validateIntervention, (req, res) => res.status(200).json({ success: true }));

    // Start server on temporary port
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        resolve();
      });
    });

    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    // 1. TEST: validateRegister - Valid Payload
    console.log("\n--- TEST 1: Register - Valid ---");
    {
      const response = await fetch(`${baseUrl}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: "mock-token",
          role: "citizen"
        })
      });
      assert(response.status === 200, `Valid payload should return 200 (got ${response.status})`);
      const body = await response.json();
      assert(body.success === true, "Should return success body");
    }

    // 2. TEST: validateRegister - Invalid Email and Weak Password
    console.log("\n--- TEST 2: Register - Invalid ---");
    {
      const response = await fetch(`${baseUrl}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: "",
          role: "SuperUser"
        })
      });
      assert(response.status === 400, `Invalid payload should return 400 (got ${response.status})`);
      const body = await response.json();
      assert(body.errors && body.errors.length > 0, "Should return validation errors list");
      
      const fields = body.errors.map(e => e.field);
      assert(fields.includes("idToken"), "Should identify empty idToken");
      assert(fields.includes("role"), "Should identify invalid role");
    }

    // 3. TEST: validateLogin - Missing fields
    console.log("\n--- TEST 3: Login - Missing fields ---");
    {
      const response = await fetch(`${baseUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: ""
        })
      });
      assert(response.status === 400, `Empty fields should return 400 (got ${response.status})`);
      const body = await response.json();
      const fields = body.errors.map(e => e.field);
      assert(fields.includes("idToken"), "Should identify empty idToken");
    }

    // 4. TEST: validateIssueUpload - Valid Coordinates
    console.log("\n--- TEST 4: Issue Upload - Valid coordinates ---");
    {
      const response = await fetch(`${baseUrl}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: 12.971598,
          longitude: 77.594562,
          issueType: "pothole",
          severity: "Medium",
          affectedArea: "Road",
          description: "Big pothole on the main street"
        })
      });
      assert(response.status === 200, `Valid coordinates should return 200 (got ${response.status})`);
    }

    // 5. TEST: validateIssueUpload - Out of range coordinates
    console.log("\n--- TEST 5: Issue Upload - Invalid coordinates & type ---");
    {
      const response = await fetch(`${baseUrl}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: 120.0,
          longitude: -200.0,
          issueType: "unknownType"
        })
      });
      assert(response.status === 400, `Invalid coordinates should return 400 (got ${response.status})`);
      const body = await response.json();
      const fields = body.errors.map(e => e.field);
      assert(fields.includes("latitude"), "Should catch out-of-bounds latitude");
      assert(fields.includes("longitude"), "Should catch out-of-bounds longitude");
      assert(fields.includes("issueType"), "Should catch invalid issue type");
    }

    // 6. TEST: validateBulkUpdate - Valid
    console.log("\n--- TEST 6: Bulk Update - Valid ---");
    {
      const response = await fetch(`${baseUrl}/bulk-update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: ["60f70f6f4d34a413d42c382f", "60f70f6f4d34a413d42c3830"],
          action: "resolved",
          weather: "rain"
        })
      });
      assert(response.status === 200, `Valid bulk actions should return 200 (got ${response.status})`);
    }

    // 7. TEST: validateBulkUpdate - Invalid IDs & Action
    console.log("\n--- TEST 7: Bulk Update - Invalid ---");
    {
      const response = await fetch(`${baseUrl}/bulk-update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: ["invalid-mongo-id"],
          action: "destroy"
        })
      });
      assert(response.status === 400, `Invalid bulk actions should return 400 (got ${response.status})`);
      const body = await response.json();
      const fields = body.errors.map(e => e.field);
      assert(fields.includes("ids[0]"), "Should flag invalid MongoDB ID in array");
      assert(fields.includes("action"), "Should flag invalid bulk action");
    }

    // 8. TEST: validateIntervention - Valid
    console.log("\n--- TEST 8: Forecast Intervention - Valid ---");
    {
      const response = await fetch(`${baseUrl}/intervention`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: ["60f70f6f4d34a413d42c382f"],
          weather: "clear"
        })
      });
      assert(response.status === 200, `Valid intervention simulation should return 200 (got ${response.status})`);
    }

    console.log("\n==================================================");
    console.log("✅ ALL INPUT VALIDATION TESTS PASSED");
    console.log("==================================================");

    server.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Test failed:", error.stack);
    if (server) server.close();
    process.exit(1);
  }
}

runTests();

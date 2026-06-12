import { validateUpload } from "../middleware/uploadMiddleware.js";

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

function runTests() {
  try {
    console.log("Starting Security Middleware Tests...");

    // 1. TEST: No file uploaded (should proceed)
    console.log("\n--- TEST 1: No file uploaded ---");
    {
      const req = {};
      const res = mockRes();
      let nextCalled = false;
      validateUpload(req, res, () => { nextCalled = true; });
      assert(nextCalled, "Should call next() if no file is present");
      assert(res.statusCode === 200, "Should remain 200");
    }

    // 2. TEST: Valid JPEG
    console.log("\n--- TEST 2: Valid JPEG file ---");
    {
      const req = {
        file: {
          originalname: "pothole.jpg",
          mimetype: "image/jpeg",
          size: 1024,
          buffer: Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]) // Valid JPEG header
        }
      };
      const res = mockRes();
      let nextCalled = false;
      validateUpload(req, res, () => { nextCalled = true; });
      assert(nextCalled, "Should allow valid JPEG file to pass");
      assert(res.statusCode === 200, "Should remain 200");
    }

    // 3. TEST: Valid PNG
    console.log("\n--- TEST 3: Valid PNG file ---");
    {
      const req = {
        file: {
          originalname: "sewer.png",
          mimetype: "image/png",
          size: 2048,
          buffer: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) // Valid PNG header
        }
      };
      const res = mockRes();
      let nextCalled = false;
      validateUpload(req, res, () => { nextCalled = true; });
      assert(nextCalled, "Should allow valid PNG file to pass");
      assert(res.statusCode === 200, "Should remain 200");
    }

    // 4. TEST: Valid WEBP
    console.log("\n--- TEST 4: Valid WEBP file ---");
    {
      const req = {
        file: {
          originalname: "garbage.webp",
          mimetype: "image/webp",
          size: 512,
          buffer: Buffer.from([
            0x52, 0x49, 0x46, 0x46, // 'RIFF'
            0x24, 0x08, 0x00, 0x00, 
            0x57, 0x45, 0x42, 0x50  // 'WEBP'
          ])
        }
      };
      const res = mockRes();
      let nextCalled = false;
      validateUpload(req, res, () => { nextCalled = true; });
      assert(nextCalled, "Should allow valid WEBP file to pass");
      assert(res.statusCode === 200, "Should remain 200");
    }

    // 5. TEST: File size limit check (exceeds 5MB)
    console.log("\n--- TEST 5: Exceeds 5MB size limit ---");
    {
      const req = {
        file: {
          originalname: "huge.jpg",
          mimetype: "image/jpeg",
          size: 6 * 1024 * 1024, // 6MB
          buffer: Buffer.from([0xFF, 0xD8, 0xFF, 0xE0])
        }
      };
      const res = mockRes();
      let nextCalled = false;
      validateUpload(req, res, () => { nextCalled = true; });
      assert(!nextCalled, "Should reject large file");
      assert(res.statusCode === 400, "Should return 400 bad request");
      assert(res.body.error.includes("exceeds 5MB"), "Should return size error message");
    }

    // 6. TEST: Invalid extension check
    console.log("\n--- TEST 6: Invalid extension ---");
    {
      const req = {
        file: {
          originalname: "malicious.exe",
          mimetype: "image/jpeg",
          size: 100,
          buffer: Buffer.from([0xFF, 0xD8, 0xFF, 0xE0])
        }
      };
      const res = mockRes();
      let nextCalled = false;
      validateUpload(req, res, () => { nextCalled = true; });
      assert(!nextCalled, "Should reject file with bad extension");
      assert(res.statusCode === 400, "Should return 400 bad request");
      assert(res.body.error.includes("extension"), "Should return extension error message");
    }

    // 7. TEST: Invalid mimetype check
    console.log("\n--- TEST 7: Invalid mimetype ---");
    {
      const req = {
        file: {
          originalname: "photo.jpg",
          mimetype: "text/plain",
          size: 100,
          buffer: Buffer.from([0xFF, 0xD8, 0xFF, 0xE0])
        }
      };
      const res = mockRes();
      let nextCalled = false;
      validateUpload(req, res, () => { nextCalled = true; });
      assert(!nextCalled, "Should reject invalid mimetype");
      assert(res.statusCode === 400, "Should return 400 bad request");
      assert(res.body.error.includes("Mime type"), "Should return mimetype error message");
    }

    // 8. TEST: Magic number check failure
    console.log("\n--- TEST 8: Magic signature check failure ---");
    {
      const req = {
        file: {
          originalname: "fake.jpg",
          mimetype: "image/jpeg",
          size: 100,
          buffer: Buffer.from([0x00, 0x00, 0x00, 0x00]) // fake bytes
        }
      };
      const res = mockRes();
      let nextCalled = false;
      validateUpload(req, res, () => { nextCalled = true; });
      assert(!nextCalled, "Should reject file with wrong magic signature");
      assert(res.statusCode === 400, "Should return 400 bad request");
      assert(res.body.error.toLowerCase().includes("magic signature"), "Should return signature error message");
    }

    console.log("\n==================================================");
    console.log("✅ ALL FILE UPLOAD SECURITY TESTS PASSED");
    console.log("==================================================");

  } catch (error) {
    console.error("❌ Test failed:", error.stack);
    process.exit(1);
  }
}

runTests();

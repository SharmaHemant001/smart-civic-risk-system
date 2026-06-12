import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testFiles = [
  "riskEngine.test.js",
  "auth.test.js",
  "rbac.test.js",
  "security.test.js",
  "validation.test.js",
  "authority.test.js",
  "forecast.test.js",
  "ai.test.js",
  "route.test.js",
  "escalation.test.js",
  "performance.test.js"
];

console.log("======================================================");
console.log("🚦 CIVICGUARD BACKEND UNIFIED TEST SUITE RUNNER");
console.log("======================================================");

let passedCount = 0;
let failedCount = 0;
const results = [];

for (const file of testFiles) {
  const filePath = path.join(__dirname, file);
  console.log(`\n▶ Running: ${file}...`);
  try {
    const stdout = execSync(`node "${filePath}"`, {
      cwd: path.join(__dirname, ".."),
      env: process.env,
      stdio: "pipe"
    }).toString();
    console.log(stdout);
    console.log(`✅ PASSED: ${file}`);
    results.push({ file, status: "PASS" });
    passedCount++;
  } catch (error) {
    console.error(`❌ FAILED: ${file}`);
    if (error.stdout) console.log(error.stdout.toString());
    if (error.stderr) console.error(error.stderr.toString());
    results.push({ file, status: "FAIL", error: error.message });
    failedCount++;
  }
}

console.log("\n======================================================");
console.log("📊 FINAL TEST EXECUTION SUMMARY");
console.log("======================================================");
results.forEach(res => {
  const statusIndicator = res.status === "PASS" ? "✅ PASS" : "❌ FAIL";
  console.log(`${res.file.padEnd(25)} : ${statusIndicator}`);
});
console.log("------------------------------------------------------");
console.log(`Total: ${testFiles.length} | Passed: ${passedCount} | Failed: ${failedCount}`);
console.log("======================================================");

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

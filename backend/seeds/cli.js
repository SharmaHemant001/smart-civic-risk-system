#!/usr/bin/env node

import { seedDatabase, resetDatabase } from "./seedData.js";

const command = process.argv[2];

if (command === "reset") {
  console.log("🔄 Resetting database...");
  resetDatabase();
} else {
  console.log("🌱 Seeding database...");
  seedDatabase();
}

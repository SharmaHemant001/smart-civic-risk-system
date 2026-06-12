import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../backend/models/User.js";

dotenv.config({ path: "./backend/.env" });

async function check() {
  try {
    if (!process.env.MONGO_URI) {
      // try other path
      dotenv.config({ path: "./.env" });
    }
    console.log("Connecting to:", process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected.");
    
    const users = await User.find({});
    console.log("Total Users in DB:", users.length);
    users.forEach(u => {
      console.log(`- ID: ${u._id} | ProviderId: ${u.authProviderId} | Email: ${u.email} | Role: ${u.role} | displayName: ${u.displayName}`);
    });
    
    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
}

check();

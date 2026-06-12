import express from "express";
import EscalationEvent from "../models/EscalationEvent.js";
import { checkEscalationEvents } from "../services/escalationService.js";

const router = express.Router();

// GET all escalations
router.get("/", async (req, res) => {
  try {
    await checkEscalationEvents();
    const list = await EscalationEvent.find().sort({ timestamp: -1 });
    res.status(200).json(list);
  } catch (error) {
    console.error("GET ESCALATIONS ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET recent escalations (limit 20, last 24 hours)
router.get("/recent", async (req, res) => {
  try {
    await checkEscalationEvents();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const list = await EscalationEvent.find({
      timestamp: { $gte: twentyFourHoursAgo }
    }).sort({ timestamp: -1 }).limit(20);
    res.status(200).json(list);
  } catch (error) {
    console.error("GET RECENT ESCALATIONS ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST check escalations manually
router.post("/check", async (req, res) => {
  try {
    const newEvents = await checkEscalationEvents();
    res.status(200).json({
      message: `Checked for escalations. Triggered ${newEvents.length} new event(s).`,
      events: newEvents
    });
  } catch (error) {
    console.error("CHECK ESCALATIONS ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;


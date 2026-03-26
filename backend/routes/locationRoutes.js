import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.get("/reverse", async (req, res) => {
  const { lat, lon } = req.query;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      {
        headers: {
          "User-Agent": "civic-backend-app", // ✅ IMPORTANT
        },
      }
    );

    const data = await response.json();

    const address = data.address || {};

    const name =
      address.city ||
      address.town ||
      address.village ||
      address.suburb ||
      address.county ||
      address.state ||
      data.display_name ||
      "Unknown";

    res.json({ name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ name: "Unknown" });
  }
});

export default router;
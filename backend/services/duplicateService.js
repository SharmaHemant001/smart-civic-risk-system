import Issue from "../models/Issue.js";

// 🔥 Haversine distance (meters)
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const toRad = (v) => (v * Math.PI) / 180;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) *
      Math.cos(φ2) *
      Math.sin(Δλ / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

// 🔥 Smart Duplicate Detection
export const checkDuplicate = async (latitude, longitude, issueType) => {
  try {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    // 🔥 Narrow DB search (performance boost)
    const nearbyIssues = await Issue.find({
      issueType,
      latitude: { $gte: lat - 0.01, $lte: lat + 0.01 },
      longitude: { $gte: lng - 0.01, $lte: lng + 0.01 },
    });

    console.log("🔍 Checking duplicates among:", nearbyIssues.length);

    for (let issue of nearbyIssues) {
      const distance = getDistance(
        lat,
        lng,
        issue.latitude,
        issue.longitude
      );

      console.log(`📏 Distance to ${issue._id}:`, distance.toFixed(2), "m");

      // 🔥 Dynamic threshold (more votes → larger area)
      const threshold = issue.votes > 5 ? 150 : 100;

      if (distance <= threshold) {
        console.log("⚠️ Duplicate detected:", issue._id);
        return issue;
      }
    }

    console.log("✅ No duplicate found");
    return null;

  } catch (error) {
    console.error("❌ Duplicate check error:", error);
    return null;
  }
};
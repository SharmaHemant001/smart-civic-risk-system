// 🔥 In-memory cache
const locationCache = {};

export default async function getLocationName(lat, lon) {
  try {
    if (!lat || !lon) return "Unknown";

    const key = `${lat}-${lon}`;

    // ✅ CACHE
    if (locationCache[key]) {
      return locationCache[key];
    }

    // ✅ CORRECT BACKEND CALL
    const res = await fetch(
      `http://localhost:5000/api/location/reverse?lat=${lat}&lon=${lon}`
    );

    if (!res.ok) {
      throw new Error("Failed API");
    }

    const data = await res.json();

    const name =
      data?.name ||
      data?.display_name?.split(",")[0] ||
      "Unknown";

    locationCache[key] = name;

    return name;

  } catch (err) {
    console.error("Location fetch error:", err);
    return "Unknown";
  }
}
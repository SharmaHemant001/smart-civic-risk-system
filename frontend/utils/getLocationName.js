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
    
    // 🔥 STRICT ENV (NO LOCALHOST IN PROD)
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

    if (!BASE_URL) {
      console.error("❌ NEXT_PUBLIC_API_URL not defined");
      return "Unknown";
    }

    const res = await fetch(
      `${BASE_URL}/location/reverse?lat=${lat}&lon=${lon}`
    );

    if (!res.ok) {
      console.error("API Error:", res.status);
      return "Unknown";
    }

    const data = await res.json();

    const name =
      data?.name ||
      data?.display_name?.split(",")[0] ||
      "Unknown";

    // ✅ SAVE CACHE
    locationCache[key] = name;

    return name;

  } catch (err) {
    console.error("Location fetch error:", err.message);
    return "Unknown";
  }
}
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

    // ✅ DIRECT OPENSTREETMAP API (NO ENV NEEDED)
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
    );

    if (!res.ok) {
      console.error("API Error:", res.status);
      return "Unknown";
    }

    const data = await res.json();

    const name =
      data?.address?.city ||
      data?.address?.town ||
      data?.address?.village ||
      data?.display_name?.split(",")[0] ||
      "Unknown";

    // ✅ CACHE SAVE
    locationCache[key] = name;

    return name;

  } catch (err) {
    console.error("Location fetch error:", err.message);
    return "Unknown";
  }
}
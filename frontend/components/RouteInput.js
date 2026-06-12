"use client";
import { useState } from "react";
import API from "../utils/api";

const FALLBACK_GEOLOCATIONS = {
  "delhi": { lat: 28.6139, lon: 77.2090 },
  "new delhi": { lat: 28.6139, lon: 77.2090 },
  "noida": { lat: 28.5355, lon: 77.3910 },
  "noida sector 62": { lat: 28.6219, lon: 77.3639 },
  "gurgaon": { lat: 28.4595, lon: 77.0266 },
  "saket": { lat: 28.5244, lon: 77.2066 },
  "karol bagh": { lat: 28.6481, lon: 77.1887 },
  "connaught place": { lat: 28.6304, lon: 77.2177 },
  "india gate": { lat: 28.6129, lon: 77.2295 },
  "india gate delhi": { lat: 28.6129, lon: 77.2295 }
};

export default function RouteInput({ setRoute, setRouteIssues }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);

  const getCoordinates = async (place) => {
    const cleaned = place.toLowerCase().trim();

    // 1. Check direct local dictionary first
    if (FALLBACK_GEOLOCATIONS[cleaned]) {
      console.log(`📍 Found local exact match for "${place}":`, FALLBACK_GEOLOCATIONS[cleaned]);
      return FALLBACK_GEOLOCATIONS[cleaned];
    }

    // 2. Check substring matching
    for (const [name, coords] of Object.entries(FALLBACK_GEOLOCATIONS)) {
      if (cleaned.includes(name) || name.includes(cleaned)) {
        console.log(`📍 Found local substring match for "${place}" (matched: "${name}"):`, coords);
        return coords;
      }
    }

    // 3. Fallback to Nominatim geocoding
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
      place + ", India"
    )}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "CivicGuard-Release-Candidate"
      }
    });

    if (!res.ok) {
      throw new Error("Geocoding API network issue");
    }

    const data = await res.json();
    console.log("📍 Nominatim Remote:", data);

    if (!data || data.length === 0) {
      throw new Error(`Location not found: ${place}`);
    }

    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
    };
  };

  const handleRoute = async () => {
    try {
      if ((!currentPosition && !start) || !end) {
        alert("Please enter both locations or use current location.");
        return;
      }

      setLoading(true);

      const startCoords = currentPosition
        ? currentPosition
        : await getCoordinates(start);
      const endCoords = await getCoordinates(end);

      // Fetch route risk analysis from backend
      const res = await API.post("/routes/risk-analysis", {
        start: startCoords,
        end: endCoords
      });

      setRoute({
        start: startCoords,
        end: endCoords,
        routes: res.data.routes,
        recommendedRoute: res.data.recommendedRoute
      });

      setRouteIssues([]); // reset
    } catch (err) {
      console.error("❌ Route Error:", err);
      alert(
        `Could not resolve route. Please check spelling or select one of our recommendations below.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full md:w-80 bg-slate-900/90 backdrop-blur-xl text-white border border-white/10 shadow-2xl rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm">🚗</span>
        <h2 className="text-xs font-bold uppercase tracking-wider">Route Safety Planner</h2>
      </div>

      {/* START LOCATION INPUT */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] text-white/50 uppercase font-semibold">Start Location</label>
        <div className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="e.g. My Location or Delhi"
            value={currentPosition ? "My current location" : start}
            onChange={(e) => {
              setStart(e.target.value);
              setCurrentPosition(null);
            }}
            disabled={Boolean(currentPosition)}
            className="w-full px-3 py-2 rounded-lg bg-slate-950/50 text-white placeholder-white/30 border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs transition"
          />
          <button
            type="button"
            onClick={() => {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  setCurrentPosition({
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude,
                  });
                  setStart("");
                },
                (err) => {
                  console.error(err);
                  alert("Unable to acquire current location.");
                },
                { enableHighAccuracy: true, timeout: 10000 }
              );
            }}
            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider text-left self-start hover:underline"
          >
            📍 Use current location
          </button>
        </div>
      </div>

      {/* DESTINATION INPUT */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] text-white/50 uppercase font-semibold">Destination</label>
        <input
          type="text"
          placeholder="e.g. India Gate or Noida"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-slate-950/50 text-white placeholder-white/30 border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs transition"
        />
      </div>

      {/* QUICK SUGGESTIONS */}
      <div className="text-[10px] text-white/55 space-y-1.5 border-t border-white/5 pt-3">
        <p className="font-bold uppercase tracking-wider text-[9px] text-indigo-300">💡 Quick Suggestions:</p>
        <div className="flex flex-wrap gap-1.5">
          {["India Gate", "Connaught Place", "Noida Sector 62", "Saket", "Karol Bagh", "Gurgaon"].map((place) => (
            <button
              key={place}
              type="button"
              onClick={() => {
                if (!start && !currentPosition) {
                  setStart("Delhi");
                }
                setEnd(place);
              }}
              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/5 transition text-[9px] font-bold text-white/80 cursor-pointer"
            >
              {place}
            </button>
          ))}
        </div>
      </div>

      {/* SHOW ROUTE BUTTON */}
      <button
        onClick={handleRoute}
        disabled={loading}
        className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all ${
          loading
            ? "bg-slate-800 text-white/40 cursor-not-allowed border border-white/5"
            : "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:opacity-90 active:scale-95 cursor-pointer"
        }`}
      >
        {loading ? "Calculating Safest Path..." : "Calculate Safe Route"}
      </button>
    </div>
  );
}

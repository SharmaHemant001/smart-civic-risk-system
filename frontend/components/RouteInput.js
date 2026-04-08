"use client";

import { useState } from "react";

export default function RouteInput({ setRoute, setRouteIssues }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);

  // ✅ FIXED (JS + reliable API)
  const getCoordinates = async (place) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
      place + ", India"
    )}`;

    const res = await fetch(url);

    if (!res.ok) {
      throw new Error("API blocked");
    }

    const data = await res.json();

    console.log("📍 Nominatim:", data);

    if (!data || data.length === 0) {
      throw new Error("Location not found");
    }

    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
    };
  };

  const handleRoute = async () => {
    try {
      if ((!currentPosition && !start) || !end) {
        alert("Enter both locations or use current location");
        return;
      }

      setLoading(true);

      const startCoords = currentPosition
        ? currentPosition
        : await getCoordinates(start);
      const endCoords = await getCoordinates(end);

      setRoute({
        start: startCoords,
        end: endCoords,
      });

      setRouteIssues([]); // reset

    } catch (err) {
      console.error("❌ Route Error:", err);

      alert(
        "Location not found. Try:\n• Noida Sector 62\n• India Gate Delhi"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full md:w-80
                 bg-black/70 backdrop-blur-xl text-white
                 border border-white/10
                 shadow-xl rounded-2xl p-5 space-y-4">

      <h2 className="text-sm font-semibold">🚗 Route Planner</h2>

      <div className="flex flex-col gap-2">
        <input
          type="text"
          placeholder="Start location"
          value={currentPosition ? "My current location" : start}
          onChange={(e) => {
            setStart(e.target.value);
            setCurrentPosition(null);
          }}
          disabled={Boolean(currentPosition)}
          className="w-full px-3 py-2 rounded-lg
                     bg-white/10 text-white placeholder-gray-400
                     border border-white/20
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              () => {
                alert("Unable to get your current location.");
              },
              { enableHighAccuracy: true, timeout: 10000 }
            );
          }}
          className="text-xs text-white/80 underline underline-offset-2"
        >
          Use my current location
        </button>
      </div>

      <input
        type="text"
        placeholder="Destination"
        value={end}
        onChange={(e) => setEnd(e.target.value)}
        className="w-full px-3 py-2 rounded-lg
                   bg-white/10 text-white placeholder-gray-400
                   border border-white/20
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <button
        onClick={handleRoute}
        disabled={loading}
        className={`w-full py-2 rounded-lg font-medium transition ${
          loading
            ? "bg-gray-600 cursor-not-allowed"
            : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90"
        }`}
      >
        {loading ? "Finding Route..." : "Show Route"}
      </button>
    </div>
  );
}

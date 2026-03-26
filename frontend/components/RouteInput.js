
"use client";

import { useState } from "react";
import API from "../utils/api";

export default function RouteInput({ setRoute, setRouteIssues }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(false);

  const getCoordinates = async (place) => {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${place}`
    );
    const data = await res.json();

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
      if (!start || !end) {
        alert("Enter both locations");
        return;
      }

      setLoading(true);

      const startCoords = await getCoordinates(start);
      const endCoords = await getCoordinates(end);

      const routeData = {
        start: startCoords,
        end: endCoords,
      };

      setRoute(routeData);

      const res = await API.post("/issues/route", {
        routeCoordinates: [
          { lat: startCoords.lat, lng: startCoords.lon },
          { lat: endCoords.lat, lng: endCoords.lon },
        ],
      });

      setRouteIssues(res.data);
    } catch (err) {
      console.error(err);
      alert("Route failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="absolute top-6 right-6 z-[1000] w-80
                 bg-black/70 backdrop-blur-xl text-white
                 border border-white/10
                 shadow-[0_10px_40px_rgba(0,0,0,0.6)]
                 rounded-2xl p-5 space-y-4
                 hover:scale-[1.01] transition"
    >
      {/* 🔥 Title */}
      <h2 className="text-sm font-semibold text-white flex items-center gap-2">
        🚗 Route Planner
      </h2>

      {/* 📍 Start */}
      <input
        type="text"
        placeholder="Start location"
        className="w-full px-3 py-2 rounded-lg
                   bg-white/10 text-white placeholder-gray-400
                   border border-white/20
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
        onChange={(e) => setStart(e.target.value)}
      />

      {/* 📍 End */}
      <input
        type="text"
        placeholder="Destination"
        className="w-full px-3 py-2 rounded-lg
                   bg-white/10 text-white placeholder-gray-400
                   border border-white/20
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
        onChange={(e) => setEnd(e.target.value)}
      />

      {/* 🚀 Button */}
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


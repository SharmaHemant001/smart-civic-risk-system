"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import API from "../../utils/api";

type Issue = {
  _id: string;
  imageUrl: string;
  issueType: string;
  latitude: number;
  longitude: number;
  votes: number;
  riskScore: string;
  riskValue?: number;
  status: string;
  timeline?: any;
};

const MapComponent = dynamic(
  () => import("@/components/MapComponent"),
  { ssr: false }
);

const FALLBACK_GEOLOCATIONS: { [key: string]: { lat: number; lon: number } } = {
  "delhi": { lat: 28.6139, lon: 77.2090 },
  "new delhi": { lat: 28.6139, lon: 77.2090 },
  "noida": { lat: 28.5355, lon: 77.3910 },
  "noida sector 62": { lat: 28.6219, lon: 77.3639 },
  "gurgaon": { lat: 28.4595, lon: 77.0266 },
  "saket": { lat: 28.5244, lon: 77.2066 },
  "karol bagh": { lat: 28.6481, lon: 77.1887 },
  "connaught place": { lat: 28.6304, lon: 77.2177 },
  "india gate": { lat: 28.6129, lon: 77.2295 },
  "india gate delhi": { lat: 28.6129, lon: 77.2295 },
  "greater noida": { lat: 28.4744, lon: 77.5030 },
  "dadri": { lat: 28.5492, lon: 77.5532 },
  "khurja": { lat: 28.2523, lon: 77.8566 }
};

const NEIGHBORHOOD_COORDS: { [key: string]: [number, number] } = {
  "Connaught Place": [28.6328, 77.1896],
  "Saket": [28.5244, 77.1933],
  "DLF Cyber City": [28.4595, 77.1085],
  "Noida City Center": [28.5921, 77.3635],
  "Vasant Kunj": [28.5168, 77.1998],
  "Lajpat Nagar": [28.5644, 77.2389],
  "Karol Bagh": [28.6505, 77.2028],
  "Greater Kailash": [28.5244, 77.2477],
  "Rajouri Garden": [28.6659, 77.0826],
  "Rohini": [28.7501, 77.0373],
  "Dwarka": [28.5921, 77.0460],
  "Malviya Nagar": [28.5199, 77.2013],
  "Delhi Cantt": [28.6430, 77.1334],
  "Noida": [28.5355, 77.3910],
  "Greater Noida": [28.4744, 77.5030],
  "Dadri": [28.5492, 77.5532],
  "Khurja": [28.2523, 77.8566]
};

// Expanded Region Bounding Box (Delhi NCR) to cover Delhi-Khurja routing
const NCR_BOUNDS = {
  minLat: 28.0000,
  maxLat: 29.0000,
  minLon: 76.5000,
  maxLon: 78.1000
};

const isPointInNCR = (lat: number, lon: number) => {
  return lat >= NCR_BOUNDS.minLat && lat <= NCR_BOUNDS.maxLat &&
         lon >= NCR_BOUNDS.minLon && lon <= NCR_BOUNDS.maxLon;
};

// Helper: Flat-Earth distance calculation in kilometers
const getDistanceFE = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Helper: Calculate overlap similarity of two polylines (0 to 1)
const geometrySimilarity = (geomA: any, geomB: any) => {
  if (!geomA || !geomB || !geomA.coordinates || !geomB.coordinates) return 0;
  const coordsA = geomA.coordinates; // [[lon, lat], ...]
  const coordsB = geomB.coordinates.map((c: any) => ({ lat: c[1], lon: c[0] }));
  
  let sharedCount = 0;
  const step = Math.max(1, Math.floor(coordsA.length / 50));
  let totalSampled = 0;
  
  for (let i = 0; i < coordsA.length; i += step) {
    totalSampled++;
    const p = { lat: coordsA[i][1], lon: coordsA[i][0] };
    let minDist = Infinity;
    
    // Sample points from B to optimize execution time
    const stepB = Math.max(1, Math.floor(coordsB.length / 50));
    for (let j = 0; j < coordsB.length; j += stepB) {
      const d = getDistanceFE(p.lat, p.lon, coordsB[j].lat, coordsB[j].lon);
      if (d < minDist) minDist = d;
    }
    
    if (minDist <= 0.1) { // 100 meters overlap threshold
      sharedCount++;
    }
  }
  
  return totalSampled > 0 ? sharedCount / totalSampled : 0;
};

// Helper: Check if two routes are equivalent
const routesAreEquivalent = (a: any, b: any) => {
  if (!a || !b) return false;
  const distDiff = Math.abs(a.distance - b.distance);
  const durDiff = Math.abs(a.duration - b.duration);
  const similarity = geometrySimilarity(a.geometry, b.geometry);
  return distDiff < 100 && durDiff < 60 && similarity > 0.95;
};

export default function DriverPage() {
  const [weather, setWeather] = useState("clear");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [filter, setFilter] = useState("");
  const [route, setRoute] = useState<any>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string>("Route A");
  const [selectedIssue, setSelectedIssue] = useState<any>(null);

  // Frequently Requested Destinations state
  const [frequentDestinations, setFrequentDestinations] = useState<any[]>([]);
  const [isDemo, setIsDemo] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const mode = localStorage.getItem("demoMode");
      setIsDemo(mode !== "false");
    }
  }, []);

  // GIS Layer controls
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showMarkers, setShowMarkers] = useState(false);
  const [showNeighborhoods, setShowNeighborhoods] = useState(false);
  const [showRouteSegments, setShowRouteSegments] = useState(true);

  // Search Inputs inside sidebar
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<any>(null);

  const selectedRoute = useMemo(() => {
    if (!route || !route.routes) return null;
    return route.routes.find((r: any) => r.routeId === selectedRouteId) || route.routes[0];
  }, [route, selectedRouteId]);

  const routeIssues = useMemo(() => {
    if (!selectedRoute || !issues.length) return [];
    const ids = selectedRoute.issuesInCorridor || [];
    return issues.filter((i) => ids.includes(i._id.toString()));
  }, [selectedRoute, issues]);

  /* =====================================
     🔥 FETCH ISSUES
  ===================================== */
  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const res = await API.get(`/issues?weather=${weather}`);
        setIssues(res.data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchIssues();
    const interval = setInterval(fetchIssues, 30000);
    return () => clearInterval(interval);
  }, [weather]);

  /* =====================================
     🔥 GET SELECTED ISSUE FROM DASHBOARD
  ===================================== */
  useEffect(() => {
    const stored = localStorage.getItem("selectedIssue");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setTimeout(() => setSelectedIssue(parsed), 0);
        localStorage.removeItem("selectedIssue");
      } catch (e) {
        console.error("Error parsing selected issue", e);
      }
    }
  }, []);

  /* =====================================
     🔥 FETCH FREQUENTLY REQUESTED DESTINATIONS
  ===================================== */
  useEffect(() => {
    const fetchFrequentDestinations = async () => {
      try {
        const res = await API.get("/routes/frequent-destinations");
        if (res.data && res.data.length > 0) {
          setFrequentDestinations(res.data);
        } else {
          // Fallback destinations
          setFrequentDestinations([
            { destination: "India Gate", requestCount: 0 },
            { destination: "Connaught Place", requestCount: 0 },
            { destination: "Noida Sector 62", requestCount: 0 },
            { destination: "Saket", requestCount: 0 },
            { destination: "Karol Bagh", requestCount: 0 }
          ]);
        }
      } catch (err) {
        console.error("Error fetching frequent destinations:", err);
        // Fallback destinations on error
        setFrequentDestinations([
          { destination: "India Gate", requestCount: 0 },
          { destination: "Connaught Place", requestCount: 0 },
          { destination: "Noida Sector 62", requestCount: 0 },
          { destination: "Saket", requestCount: 0 },
          { destination: "Karol Bagh", requestCount: 0 }
        ]);
      }
    };

    fetchFrequentDestinations();
  }, []);

  /* =====================================
     🔥 FILTER ROUTE ISSUES
  ===================================== */
  const displayIssues = useMemo(() => {
    if (route) {
      return filter
        ? routeIssues.filter((i) => i.issueType === filter)
        : routeIssues;
    }
    if (selectedIssue) {
      return [selectedIssue];
    }
    return [];
  }, [route, routeIssues, filter, selectedIssue]);

  /* =====================================
     🔥 GEOLOCATION & OSRM INTERACTION
  ===================================== */
  const getCoordinates = async (place: string) => {
    const cleaned = place.toLowerCase().trim();
    if (FALLBACK_GEOLOCATIONS[cleaned]) return FALLBACK_GEOLOCATIONS[cleaned];
    
    for (const [name, coords] of Object.entries(FALLBACK_GEOLOCATIONS)) {
      if (cleaned.includes(name) || name.includes(cleaned)) {
        return coords;
      }
    }

    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
      place + ", India"
    )}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "CivicGuard-Driver-Console"
      }
    });

    if (!res.ok) {
      throw new Error("Geocoding API network issue");
    }

    const data = await res.json();
    if (!data || data.length === 0) {
      throw new Error(`Location not found: ${place}`);
    }

    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
    };
  };

  const calculateRoute = async (startLoc: string, endLoc: string) => {
    try {
      setLoadingRoute(true);
      const startCoords = currentPosition || await getCoordinates(startLoc);
      const endCoords = await getCoordinates(endLoc);

      const res = await API.post("/routes/risk-analysis", {
        start: startCoords,
        end: endCoords,
        startName: startLoc || (currentPosition ? "GPS Location" : "Delhi"),
        endName: endLoc
      });

      setRoute({
        start: startCoords,
        end: endCoords,
        routes: res.data.routes,
        recommendedRoute: res.data.recommendedRoute
      });

      setSelectedIssue(null);
    } catch (err) {
      console.error("❌ Route Error:", err);
      alert(`Could not resolve route. Please try another destination.`);
    } finally {
      setLoadingRoute(false);
    }
  };

  const handleRouteSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!start && !currentPosition) || !end) {
      alert("Please specify both a start location and destination.");
      return;
    }
    calculateRoute(start, end);
  };

  const handleFrequentDestClick = (place: string) => {
    setEnd(place);
  };

  /* =====================================
     🚗 ROUTING EQUIVALENCY DETECTION
  ===================================== */
  const hideRouteB = useMemo(() => {
    if (!route || !route.routes || route.routes.length < 2) return false;
    return routesAreEquivalent(route.routes[0], route.routes[1]);
  }, [route]);

  useEffect(() => {
    if (route && route.routes) {
      if (hideRouteB) {
        setSelectedRouteId("Route A");
      }
    }
  }, [route, hideRouteB]);

  /* =====================================
     🌐 TRAVERSED NEIGHBORHOODS & CRI
  ===================================== */
  const getRouteCorridorStats = (r: any) => {
    if (!r) {
      return {
        traversedNeighborhoods: [],
        neighborhoodDetails: [],
        averageCRI: 0,
        highestCRI: 0,
        hazardsCount: 0,
        criticalCount: 0,
        escalationsCount: 0,
        nearbyHazardsCount: 0
      };
    }

    // 1. Traversed Neighborhoods (Buffer = 2.5 km)
    let found: string[] = [];
    if (r.geometry && r.geometry.coordinates) {
      const coords = r.geometry.coordinates;
      found = Object.entries(NEIGHBORHOOD_COORDS)
        .filter(([_, nCoords]) => {
          let minD = Infinity;
          const step = Math.max(1, Math.floor(coords.length / 20));
          for (let i = 0; i < coords.length; i += step) {
            const c = coords[i];
            const d = getDistanceFE(nCoords[0], nCoords[1], c[1], c[0]);
            if (d < minD) minD = d;
          }
          return minD <= 2.5; // CORRIDOR_BUFFER_KM = 2.5
        })
        .map(([name]) => name);
    }

    // 2. Filter corridor issues
    const corridorIds = r.issuesInCorridor || [];
    const localRouteIssues = issues.filter((i) => corridorIds.includes(i._id.toString()));

    const hazardsCount = localRouteIssues.length;
    const criticalCount = localRouteIssues.filter((i) => i.riskScore === "Critical" || (i.riskValue && i.riskValue >= 80)).length;
    const escalationsCount = localRouteIssues.filter((i) => (i.votes || 0) >= 3).length;

    // 3. Calculate Nearby Hazard Clusters (within 1.0 km of route but NOT in corridor)
    let nearbyHazardsCount = 0;
    if (r.geometry && r.geometry.coordinates) {
      const coords = r.geometry.coordinates;
      issues.forEach((issue) => {
        if (corridorIds.includes(issue._id.toString())) return;
        if (["resolved", "invalid"].includes(issue.status || "")) return;

        let minD = Infinity;
        const step = Math.max(1, Math.floor(coords.length / 50));
        for (let i = 0; i < coords.length; i += step) {
          const d = getDistanceFE(issue.latitude, issue.longitude, coords[i][1], coords[i][0]);
          if (d < minD) minD = d;
        }
        if (minD <= 1.0) { // 1.0 km radius
          nearbyHazardsCount++;
        }
      });
    }

    // 4. Neighborhood Details based strictly on corridor issues (Integrity check)
    const neighborhoodDetails = found.map((name) => {
      const coords = NEIGHBORHOOD_COORDS[name] || [28.6139, 77.2090];
      
      const localIssues = localRouteIssues.filter((issue) => {
        const d = getDistanceFE(coords[0], coords[1], issue.latitude, issue.longitude);
        return d <= 2.5;
      });
      
      const activeCount = localIssues.length;
      const criticalCountLocal = localIssues.filter((i) => i.riskScore === "Critical" || (i.riskValue && i.riskValue >= 80)).length;
      
      let baseCRI = 0;
      if (activeCount > 0) {
        baseCRI = activeCount * 6 + criticalCountLocal * 16;
        if (weather === "rain") baseCRI += 14;
        else if (weather === "heat") baseCRI += 7;
      }
      
      const criScore = Math.min(95, Math.max(0, baseCRI));
      
      let trend = "Stable →";
      if (criticalCountLocal > 1 || (weather === "rain" && activeCount > 2)) {
        trend = "Degrading ↑";
      } else if (activeCount === 0) {
        trend = "Improving ↓";
      }
      
      return {
        name,
        criScore,
        activeHazards: activeCount,
        criticalIssues: criticalCountLocal,
        trend
      };
    });

    const averageCRI = neighborhoodDetails.length > 0
      ? Math.round(neighborhoodDetails.reduce((acc, curr) => acc + curr.criScore, 0) / neighborhoodDetails.length)
      : 0;

    const highestCRI = neighborhoodDetails.length > 0
      ? Math.max(...neighborhoodDetails.map((n) => n.criScore))
      : 0;

    return {
      traversedNeighborhoods: found,
      neighborhoodDetails,
      averageCRI,
      highestCRI,
      hazardsCount,
      criticalCount,
      escalationsCount,
      nearbyHazardsCount
    };
  };

  const selectedRouteCorridorStats = useMemo(() => {
    return getRouteCorridorStats(selectedRoute);
  }, [selectedRoute, weather, issues]);

  const traversedNeighborhoods = selectedRouteCorridorStats.traversedNeighborhoods;
  const neighborhoodDetails = selectedRouteCorridorStats.neighborhoodDetails;
  const averageRouteCRI = selectedRouteCorridorStats.averageCRI;
  const highestCorridorCRI = selectedRouteCorridorStats.highestCRI;
  const escalationsNearby = selectedRouteCorridorStats.escalationsCount;

  /* =====================================
     📊 SINGLE SOURCE OF TRUTH SCORE ENGINE
  ===================================== */
  const getRouteStats = (r: any) => {
    if (!r) {
      return {
        safetyScore: 100,
        riskLevel: "Low",
        hazardsCount: 0,
        criticalCount: 0,
        roadCondition: "Excellent",
        confidence: 100,
        distancePenalty: 0,
        hazardPenalty: 0,
        criticalPenalty: 0,
        forecastPenalty: 0,
        criPenalty: 0,
        coveragePct: 100,
        coverageClass: "Full Coverage"
      };
    }
    
    // 1. Coverage Calculations
    const coords = r.geometry?.coordinates || [];
    let inNCRCount = 0;
    coords.forEach((c: any) => {
      if (isPointInNCR(c[1], c[0])) {
        inNCRCount++;
      }
    });
    const coveragePct = coords.length > 0 ? Math.round((inNCRCount / coords.length) * 100) : 100;

    // Coverage Classification Levels
    let coverageClass = "Full Coverage";
    if (coveragePct < 30) {
      coverageClass = "Out of Coverage";
    } else if (coveragePct <= 70) {
      coverageClass = "Partial Coverage";
    }

    if (coveragePct < 30) {
      return {
        safetyScore: null,
        riskLevel: "Out of Coverage",
        hazardsCount: 0,
        criticalCount: 0,
        roadCondition: "Out of Coverage",
        confidence: 0,
        distancePenalty: 0,
        hazardPenalty: 0,
        criticalPenalty: 0,
        forecastPenalty: 0,
        criPenalty: 0,
        coveragePct,
        coverageClass
      };
    }

    // 2. Corridor Stats
    const corridorStats = getRouteCorridorStats(r);
    const localHazardsCount = corridorStats.hazardsCount;
    const localCriticalCount = corridorStats.criticalCount;
    const averageCRI = corridorStats.averageCRI;

    // 3. Distance Penalty on covered portion only
    const distKm = r.distance / 1000;
    const coveredDistKm = distKm * (coveragePct / 100);
    const distPen = Math.min(15, Math.round(coveredDistKm * 0.12));

    const hazPen = Math.min(15, localHazardsCount * 1.5);
    const critPen = Math.min(25, localCriticalCount * 6);
    const forePen = weather === "rain" ? 8 : weather === "heat" ? 4 : (localHazardsCount > 0 ? 3 : 0);
    const cPen = Math.round(averageCRI * 0.15);

    const safetyScore = Math.max(10, Math.min(100, Math.round(100 - distPen - hazPen - critPen - forePen - cPen)));
    const riskLvl = safetyScore >= 85 ? "Low" : safetyScore >= 65 ? "Medium" : "High";
    const roadCond = safetyScore >= 85 ? "Excellent" : safetyScore >= 70 ? "Good" : safetyScore >= 50 ? "Fair" : "Poor";

    // 4. Confidence Score Formula
    const coverageFactor = coveragePct / 100;
    const dataCompleteness = issues.length > 0 ? 0.95 : 0.5;
    const historicalStability = Math.max(0.5, 1.0 - (localCriticalCount * 0.1) - (localHazardsCount * 0.02));
    const forecastHorizonFactor = weather === "clear" ? 0.95 : weather === "rain" ? 0.80 : 0.90;

    // Confidence Floor of 25%
    const confidence = Math.max(25, Math.round(dataCompleteness * historicalStability * coverageFactor * forecastHorizonFactor * 100));

    return {
      safetyScore,
      riskLevel: riskLvl,
      hazardsCount: localHazardsCount,
      criticalCount: localCriticalCount,
      roadCondition: roadCond,
      confidence,
      distancePenalty: distPen,
      hazardPenalty: hazPen,
      criticalPenalty: critPen,
      forecastPenalty: forePen,
      criPenalty: cPen,
      coveragePct,
      coverageClass
    };
  };

  const selectedRouteStats = useMemo(() => {
    return getRouteStats(selectedRoute);
  }, [selectedRoute, weather, averageRouteCRI, issues]);

  const hazardsCount = selectedRouteStats.hazardsCount;
  const criticalZonesCount = selectedRouteStats.criticalCount;
  const safetyRating = selectedRouteStats.safetyScore;
  const currentRiskLevel = selectedRouteStats.riskLevel;
  const roadCondition = selectedRouteStats.roadCondition;
  const forecastConfidence = selectedRouteStats.confidence;
  const coverageClass = selectedRouteStats.coverageClass;

  const forecastRisk24h = useMemo(() => {
    if (!selectedRoute) return "Stable";
    if (weather !== "clear") return "Degrading";
    if (hazardsCount > 3) return "Unstable";
    return "Stable";
  }, [selectedRoute, weather, hazardsCount]);

  const outlook7d = useMemo(() => {
    if (safetyRating !== null && safetyRating >= 85 && weather === "clear") return "Stable";
    if (safetyRating !== null && safetyRating < 65 || weather === "rain") return "Critical";
    return "Moderate";
  }, [safetyRating, weather]);

  const forecastDataExists = useMemo(() => {
    return route && selectedRouteStats.coveragePct >= 30;
  }, [route, selectedRouteStats.coveragePct]);

  /* =====================================
     📊 RISK REDUCTION SCORE LOGIC
  ===================================== */
  const riskReductionStats = useMemo(() => {
    if (!route || !route.routes || route.routes.length < 2 || hideRouteB) {
      return { pct: 0, statement: "No alternative corridor for comparison." };
    }
    
    const statsA = getRouteStats(route.routes[0]);
    const statsB = getRouteStats(route.routes[1]);

    if (statsA.safetyScore === null || statsB.safetyScore === null) {
      return { pct: 0, statement: "Insufficient coverage for comparison." };
    }

    const riskA = 100 - statsA.safetyScore;
    const riskB = 100 - statsB.safetyScore;

    if (riskA === riskB) {
      return { pct: 0, statement: "Routes have equivalent safety profiles." };
    }

    const selectedStats = selectedRouteId === "Route A" ? statsA : statsB;
    const altStats = selectedRouteId === "Route A" ? statsB : statsA;

    const riskSelected = 100 - selectedStats.safetyScore;
    const riskAlt = 100 - altStats.safetyScore;

    if (riskAlt <= 0) {
      return { pct: 0, statement: "Selected route has equivalent safety profiles." };
    }

    const pct = Math.round(((riskAlt - riskSelected) / riskAlt) * 100);
    
    if (pct > 0) {
      return {
        pct,
        statement: `Reduces projected risk exposure by ${pct}% compared to the alternative corridor.`
      };
    } else {
      return {
        pct: 0,
        statement: `Alternative corridor has lower risk exposure.`
      };
    }
  }, [route, selectedRouteId, hideRouteB, weather, averageRouteCRI, issues]);

  const riskReductionPct = riskReductionStats.pct;

  /* =====================================
     🧠 ROUTE RECOMMENDATION ENGINE
  ===================================== */
  const routeRecommendation = useMemo(() => {
    if (!route || !route.routes || route.routes.length === 0) {
      return { recommendedRoute: null, reason: "Awaiting navigation target selection.", diff: 0, reasonsList: [] };
    }
    if (route.routes.length === 1 || hideRouteB) {
      return { recommendedRoute: "Route A", reason: "Single corridor resolved. Operational profile is safe.", diff: 100, reasonsList: [] };
    }
    
    const statsA = getRouteStats(route.routes[0]);
    const statsB = getRouteStats(route.routes[1]);

    if (statsA.safetyScore === null || statsB.safetyScore === null) {
      return { recommendedRoute: null, reason: "Insufficient coverage to generate safety comparison.", diff: 0, reasonsList: [] };
    }

    const safetyDiff = Math.abs(statsA.safetyScore - statsB.safetyScore);

    if (safetyDiff < 5) {
      return {
        recommendedRoute: "No Preferred Route",
        reason: "Routes have equivalent safety profiles. No preferred route generated.",
        diff: safetyDiff,
        reasonsList: []
      };
    }

    const recommendedRoute = statsA.safetyScore > statsB.safetyScore ? "Route A" : "Route B";
    const bestStats = recommendedRoute === "Route A" ? statsA : statsB;
    const worstStats = recommendedRoute === "Route A" ? statsB : statsA;

    // Generate dynamic quantitative reasons comparing Route A and Route B
    const hazardDiff = worstStats.hazardsCount - bestStats.hazardsCount;
    const criticalDiff = worstStats.criticalCount - bestStats.criticalCount;
    const etaDiff = Math.round(Math.abs(route.routes[0].duration - route.routes[1].duration) / 60);

    const bestRouteName = recommendedRoute;
    const worstRouteName = recommendedRoute === "Route A" ? "Route B" : "Route A";

    let reasons = [];
    if (criticalDiff > 0) {
      reasons.push(`${bestRouteName} avoids ${criticalDiff} critical hazard zone${criticalDiff > 1 ? "s" : ""} compared to ${worstRouteName}`);
    }
    if (hazardDiff > 0) {
      reasons.push(`${bestRouteName} has ${hazardDiff} fewer corridor hazard${hazardDiff > 1 ? "s" : ""} than ${worstRouteName}`);
    }
    if (bestStats.safetyScore > worstStats.safetyScore) {
      reasons.push(`Safety score is ${bestStats.safetyScore - worstStats.safetyScore} points higher`);
    }
    if (etaDiff > 0) {
      reasons.push(`ETA is ${etaDiff} min faster`);
    }

    return {
      recommendedRoute,
      reason: reasons.join(", ") + ".",
      diff: safetyDiff,
      reasonsList: reasons
    };
  }, [route, hideRouteB, weather, issues]);

  // Auto-select recommended route when route analysis returns
  useEffect(() => {
    if (route && routeRecommendation.recommendedRoute) {
      if (routeRecommendation.recommendedRoute !== "No Preferred Route") {
        setSelectedRouteId(routeRecommendation.recommendedRoute);
      } else {
        setSelectedRouteId(route.routes[0].routeId);
      }
    }
  }, [route, routeRecommendation.recommendedRoute]);

  /* =====================================
     🌤 REAL WEATHER IMPACT ANALYTICS
  ===================================== */
  const weatherImpactStats = useMemo(() => {
    if (!selectedRoute || routeIssues.length === 0 || selectedRouteStats.coveragePct < 30) return null;
    
    if (weather === "rain") {
      const potholes = routeIssues.filter(i => i.issueType === "pothole" && isPointInNCR(i.latitude, i.longitude)).length;
      if (potholes > 0) {
        return `Rain: +25% risk on ${potholes} active pothole${potholes > 1 ? "s" : ""}`;
      }
    } else if (weather === "heat") {
      const garbage = routeIssues.filter(i => i.issueType === "garbage" && isPointInNCR(i.latitude, i.longitude)).length;
      if (garbage > 0) {
        return `Heat: +18% risk on ${garbage} garbage pile${garbage > 1 ? "s" : ""}`;
      }
    }
    
    return null;
  }, [routeIssues, weather, selectedRoute, selectedRouteStats.coveragePct]);

  /* =====================================
     🚨 DATA INTEGRITY VALIDATION LAYER
  ==================================== */
  const isDataValid = useMemo(() => {
    if (!selectedRoute) return true;
    const stats = selectedRouteStats;
    
    if (
      (stats.safetyScore !== null && (isNaN(stats.safetyScore) || !isFinite(stats.safetyScore))) ||
      isNaN(stats.confidence) || !isFinite(stats.confidence) ||
      isNaN(stats.distancePenalty) || !isFinite(stats.distancePenalty) ||
      isNaN(stats.hazardPenalty) || !isFinite(stats.hazardPenalty) ||
      isNaN(stats.criticalPenalty) || !isFinite(stats.criticalPenalty) ||
      isNaN(stats.forecastPenalty) || !isFinite(stats.forecastPenalty) ||
      isNaN(stats.criPenalty) || !isFinite(stats.criPenalty)
    ) {
      return false;
    }
    return true;
  }, [selectedRouteStats, selectedRoute]);

  /* =====================================
     🌐 TRAVERSED NEIGHBORHOOD MAP INJECTION
  ===================================== */
  const mapAreas = useMemo(() => {
    return Object.keys(NEIGHBORHOOD_COORDS).map((name) => {
      const coords = NEIGHBORHOOD_COORDS[name];
      const localIssues = issues.filter((issue) => {
        const d = getDistanceFE(coords[0], coords[1], issue.latitude, issue.longitude);
        return d <= 2.5 && !["resolved", "invalid"].includes(issue.status || "");
      });
      
      const activeCount = localIssues.length;
      const criticalCount = localIssues.filter((i) => i.riskScore === "Critical" || (i.riskValue && i.riskValue >= 80)).length;
      
      let baseCRI = 0;
      if (activeCount > 0) {
        baseCRI = activeCount * 6 + criticalCount * 16;
        if (weather === "rain") baseCRI += 14;
        else if (weather === "heat") baseCRI += 7;
      }
      
      const criScore = Math.min(95, Math.max(0, baseCRI));
      
      let trend = "Stable →";
      if (criticalCount > 1 || (weather === "rain" && activeCount > 2)) {
        trend = "Degrading ↑";
      } else if (activeCount === 0) {
        trend = "Improving ↓";
      }

      return {
        area: name,
        cri: criScore,
        trend,
        totalIssues: activeCount,
        criticalIssues: criticalCount,
        escalations: localIssues.filter((i) => (i.votes || 0) >= 3).length
      };
    });
  }, [issues, weather]);

  const filteredMapAreas = useMemo(() => {
    if (!route) return mapAreas;
    return mapAreas.filter((area: any) => traversedNeighborhoods.includes(area.area));
  }, [mapAreas, route, traversedNeighborhoods]);

  /* =====================================
     🏛️ DYNAMIC OPERATIONAL STATEMENTS
  ===================================== */
  const municipalStatement = useMemo(() => {
    if (!route || !route.routes) {
      return "Awaiting navigation target selection.";
    }
    
    const statsA = getRouteStats(route.routes[0]);
    const statsB = getRouteStats(route.routes[1]);

    if (statsA.safetyScore === null || statsB.safetyScore === null) {
      return "Route is outside monitored coverage network. Risk analytics do not apply.";
    }

    if (hideRouteB) {
      return "Only one viable route option was found for this journey. Current corridor risk remains low.";
    }

    const safetyDiff = Math.abs(statsA.safetyScore - statsB.safetyScore);

    if (safetyDiff < 5) {
      return "No significant safety difference detected between available routes.";
    }

    const recommendedRoute = statsA.safetyScore > statsB.safetyScore ? "Route A" : "Route B";
    const selectedStats = selectedRouteId === "Route A" ? statsA : statsB;
    const altStats = selectedRouteId === "Route A" ? statsB : statsA;

    const selectedName = selectedRouteId;
    const altName = selectedRouteId === "Route A" ? "Route B" : "Route A";

    const hazardDiff = altStats.hazardsCount - selectedStats.hazardsCount;
    const criticalDiff = altStats.criticalCount - selectedStats.criticalCount;

    if (selectedRouteId === recommendedRoute) {
      let details = [];
      if (criticalDiff > 0) {
        details.push(`avoids ${criticalDiff} critical hazard zone${criticalDiff > 1 ? "s" : ""}`);
      }
      if (hazardDiff > 0) {
        details.push(`contains ${hazardDiff} fewer corridor hazard${hazardDiff > 1 ? "s" : ""}`);
      }
      if (riskReductionPct > 0) {
        details.push(`reduces risk exposure by ${riskReductionPct}%`);
      }
      
      if (details.length > 0) {
        return `Selected route ${selectedName} is recommended as it ${details.join(", ")} compared to ${altName}.`;
      }
      return `Selected route ${selectedName} is recommended for optimal safety profile.`;
    } else {
      let details = [];
      if (criticalDiff < 0) {
        details.push(`contains ${Math.abs(criticalDiff)} more critical hazard zone${Math.abs(criticalDiff) > 1 ? "s" : ""}`);
      }
      if (hazardDiff < 0) {
        details.push(`contains ${Math.abs(hazardDiff)} more corridor hazard${Math.abs(hazardDiff) > 1 ? "s" : ""}`);
      }
      
      if (details.length > 0) {
        return `Warning: Selected route ${selectedName} ${details.join(" and ")} compared to the recommended route ${altName}.`;
      }
      return `Warning: Selected route ${selectedName} has higher cumulative risk exposure compared to ${altName}.`;
    }
  }, [route, selectedRouteId, hideRouteB, riskReductionPct, routeRecommendation]);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-slate-950 text-white overflow-hidden">
      
      {/* 💼 LEFT SIDEBAR: COMPACT ROUTE CONTROL CONSOLE */}
      <div className="w-full md:w-[420px] shrink-0 border-b md:border-b-0 md:border-r border-white/10 flex flex-col h-full bg-slate-950 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
        
        {/* Title Branding */}
        <div className="p-3.5 border-b border-white/10 bg-slate-900/20">
          <div className="flex flex-col gap-2">
            <h1 className="text-xs font-black tracking-tight text-white uppercase flex items-center gap-2">
              <span>🛡️</span> Risk-Aware Route Planner
            </h1>
            {(() => {
              const isEmptyMode = issues.length === 0 && !isDemo;
              const dataModeLabel = isEmptyMode
                ? "⚪ No Operational Data"
                : isDemo
                ? "🟣 Demo Dataset Active"
                : "🟢 Live Operational Data";
              const dataModeColor = isEmptyMode
                ? "bg-slate-500/10 border-slate-500/20 text-slate-400"
                : isDemo
                ? "bg-purple-500/10 border-purple-500/20 text-purple-400 animate-pulse"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
              return (
                <span className={`px-2 py-0.5 border rounded-full text-[8px] font-black uppercase tracking-wider self-start ${dataModeColor}`}>
                  {dataModeLabel}
                </span>
              );
            })()}
          </div>
          <p className="text-[8px] text-white/50 mt-1.5 uppercase font-bold tracking-widest">
            Citywide Route Risk Analysis Console
          </p>
        </div>

        {/* Console Panel Content */}
        <div className="p-3.5 space-y-3.5 flex-1">
          
          {/* Planner Inputs */}
          <form onSubmit={handleRouteSearchSubmit} className="space-y-2.5 bg-slate-900/40 p-3 border border-white/5 rounded-2xl shadow-inner">
            <div className="flex items-center gap-2">
              <span className="text-xs">🚗</span>
              <h2 className="text-[9px] font-black uppercase tracking-wider text-indigo-400">Route Planner</h2>
            </div>
            
            {/* Start Location */}
            <div className="space-y-0.5">
              <label className="text-[8px] text-white/40 uppercase font-black tracking-wider block">Start Location</label>
              <input
                type="text"
                placeholder="e.g. Delhi"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full px-2.5 py-1 rounded-lg bg-slate-950/80 text-white placeholder-white/20 border border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs transition"
                required
              />
            </div>

            {/* Destination */}
            <div className="space-y-0.5">
              <label className="text-[8px] text-white/40 uppercase font-black tracking-wider block">Destination</label>
              <input
                type="text"
                placeholder="e.g. India Gate or Noida"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full px-2.5 py-1 rounded-lg bg-slate-950/80 text-white placeholder-white/20 border border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loadingRoute}
              className={`w-full py-1.5 rounded-xl font-bold text-xs shadow-lg transition-all ${
                loadingRoute
                  ? "bg-slate-800 text-white/40 cursor-not-allowed border border-white/5"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white active:scale-98 cursor-pointer"
              }`}
            >
              {loadingRoute ? "Analyzing Route Risk..." : "Analyze Route Risk"}
            </button>
          </form>

          {/* Frequently Requested / Recent / Personalized Destinations */}
          <div className="space-y-2">
            <div className="flex border-b border-white/5 pb-1 gap-3 text-[8.5px] font-black uppercase tracking-wider text-white/40">
              <span className="text-indigo-400 border-b border-indigo-500 pb-1 cursor-pointer">
                Frequently Requested
              </span>
              <span className="hover:text-white/60 cursor-not-allowed" title="Feature coming soon">
                Recent
              </span>
              <span className="hover:text-white/60 cursor-not-allowed" title="Feature coming soon">
                Personalized
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-1.5">
              {frequentDestinations.map((dest) => (
                <button
                  key={dest.destination}
                  type="button"
                  onClick={() => handleFrequentDestClick(dest.destination)}
                  className="px-2 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition text-[10px] font-bold text-white/80 hover:text-white flex items-center justify-between cursor-pointer text-left overflow-hidden"
                >
                  <span className="truncate">📍 {dest.destination}</span>
                  {dest.requestCount > 0 && (
                    <span className="text-[8.5px] bg-indigo-500/20 text-indigo-400 px-1 py-0.2 rounded font-black shrink-0">
                      {dest.requestCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {isDemo && (
              <p className="text-[7.5px] text-white/30 italic uppercase font-bold tracking-wider mt-1">
                Based on seeded demonstration data
              </p>
            )}
          </div>

          {/* Data Validation Guard */}
          {!isDataValid && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-center space-y-2">
              <div className="text-2xl">🚨</div>
              <h3 className="text-xs font-black text-rose-400 uppercase tracking-wider">Insufficient Route Intelligence Data</h3>
              <p className="text-[11px] text-white/50 leading-relaxed font-medium">
                The resolved route coordinates or hazard registry contain invalid data structures. Route risk analysis cannot be computed.
              </p>
            </div>
          )}

          {/* Coverage Boundary Intelligence Card */}
          {route && selectedRouteStats && (
            <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-3.5 space-y-2.5 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Coverage Boundary Intelligence</h3>
                <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                  coverageClass === "Full Coverage" ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" :
                  coverageClass === "Partial Coverage" ? "text-amber-400 border-amber-500/20 bg-amber-500/5" :
                  "text-rose-400 border-rose-500/20 bg-rose-500/5"
                }`}>{coverageClass}</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center py-0.5 border-b border-white/5 border-dashed">
                  <span className="text-white/50 text-[11px]">Coverage Area</span>
                  <span className="font-extrabold text-white">Delhi NCR</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-white/5 border-dashed">
                  <span className="text-white/50 text-[11px]">Coverage Percentage</span>
                  <span className="font-extrabold text-white">{selectedRouteStats.coveragePct}%</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-white/50 text-[11px]">Intelligence Confidence</span>
                  <span className="font-extrabold text-indigo-300">{selectedRouteStats.confidence}%</span>
                </div>
              </div>
              {selectedRouteStats.coveragePct < 30 && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5 mt-2">
                  <p className="text-[10px] text-rose-300 font-medium leading-normal">
                    ⚠️ Most of this route is outside the CivicGuard monitoring network. Risk analytics only apply to covered segments.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Route Selector Tabs (If active and data is valid) */}
          {route && route.routes && isDataValid && (
            <div className="space-y-3.5">
              {hideRouteB ? (
                <div className="w-full text-center text-xs py-2 px-3 text-white/50 bg-slate-900/40 border border-white/5 rounded-xl font-bold uppercase tracking-wider">
                  Only one meaningful route was found.
                </div>
              ) : (
                <div className="flex gap-1.5 bg-slate-900/40 p-0.5 border border-white/5 rounded-xl">
                  {route.routes.map((r: any) => {
                    const isSelected = r.routeId === selectedRouteId;
                    const stats = getRouteStats(r);
                    const labelScore = stats.safetyScore !== null ? `${stats.safetyScore}/100` : "Out of Coverage";
                    return (
                      <button
                        key={r.routeId}
                        type="button"
                        onClick={() => setSelectedRouteId(r.routeId)}
                        className={`flex-1 py-1 rounded-lg text-center transition cursor-pointer text-xs font-bold ${
                          isSelected
                            ? "bg-indigo-600 text-white shadow"
                            : "text-white/50 hover:text-white"
                        }`}
                      >
                        {r.routeId} ({labelScore})
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Developer Console: Algorithmic Calibration Panel */}
              {selectedRouteStats.safetyScore !== null && (
                <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-3.5 space-y-2">
                  <details className="group">
                    <summary className="text-[9px] font-black uppercase tracking-wider text-indigo-400 cursor-pointer flex items-center justify-between outline-none select-none">
                      <span>⚙️ Advanced Analytics: Score Calibration</span>
                      <span className="text-white/40 transition group-open:rotate-180">▼</span>
                    </summary>
                    <div className="space-y-2 text-[10px] text-white/60 font-mono mt-2 pt-2 border-t border-white/5">
                      <div className="flex justify-between">
                        <span>Base Safety Score:</span>
                        <span className="text-white font-bold">100</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Distance Penalty:</span>
                        <span className={`font-bold ${selectedRouteStats.distancePenalty > 0 ? "text-rose-400" : "text-white/40"}`}>
                          -{selectedRouteStats.distancePenalty}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Hazard Density Penalty:</span>
                        <span className={`font-bold ${selectedRouteStats.hazardPenalty > 0 ? "text-rose-400" : "text-white/40"}`}>
                          -{selectedRouteStats.hazardPenalty}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Critical Zone Penalty:</span>
                        <span className={`font-bold ${selectedRouteStats.criticalPenalty > 0 ? "text-rose-400" : "text-white/40"}`}>
                          -{selectedRouteStats.criticalPenalty}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Forecast Weather Penalty:</span>
                        <span className={`font-bold ${selectedRouteStats.forecastPenalty > 0 ? "text-rose-400" : "text-white/40"}`}>
                          -{selectedRouteStats.forecastPenalty}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Neighborhood CRI Penalty:</span>
                        <span className={`font-bold ${selectedRouteStats.criPenalty > 0 ? "text-rose-400" : "text-white/40"}`}>
                          -{selectedRouteStats.criPenalty}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-white/5 pt-1.5 font-bold">
                        <span className="text-white font-black">Calculated Safety Score:</span>
                        <span className="text-emerald-400 font-black">{selectedRouteStats.safetyScore}/100</span>
                      </div>
                    </div>
                  </details>
                </div>
              )}

              {/* 🌟 WOW COMPARISON CARD: FASTEST VS SAFE ROUTE */}
              {route && route.routes && route.routes.length >= 2 && !hideRouteB && (
                <div className="bg-slate-900/80 border border-indigo-500/30 rounded-2xl p-4 space-y-3.5 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-[-20%] right-[-20%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none" />
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs">🚦</span>
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                      Route Intelligence Comparison
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    {/* Fastest Route */}
                    {(() => {
                      const r = [...route.routes].sort((a: any, b: any) => a.duration - b.duration)[0];
                      const stats = getRouteStats(r);
                      const riskScore = stats.safetyScore !== null ? 100 - stats.safetyScore : 87;
                      const eta = Math.round(r.duration / 60);
                      
                      return (
                        <div className="bg-slate-950/50 border border-white/5 rounded-xl p-3 space-y-1 text-left">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">⏱️ Fastest Route</span>
                          <div className="flex justify-between items-baseline">
                            <span className="text-base font-black text-white">{eta} min</span>
                            <span className="text-[10px] text-white/55">{(r.distance / 1000).toFixed(1)} km</span>
                          </div>
                          <div className="pt-1 border-t border-white/5 flex justify-between text-[10px]">
                            <span className="text-slate-400">Risk Score:</span>
                            <span className={`font-bold ${riskScore >= 75 ? "text-rose-400" : riskScore >= 50 ? "text-amber-400" : "text-emerald-400"}`}>
                              {riskScore}
                            </span>
                          </div>
                          <div className="text-[9px] text-white/35">Hazards: {stats.hazardsCount}</div>
                        </div>
                      );
                    })()}

                    {/* Safe Route */}
                    {(() => {
                      const r = [...route.routes].sort((a: any, b: any) => {
                        const statsA = getRouteStats(a);
                        const statsB = getRouteStats(b);
                        return (statsB.safetyScore || 0) - (statsA.safetyScore || 0);
                      })[0];
                      const stats = getRouteStats(r);
                      const riskScore = stats.safetyScore !== null ? 100 - stats.safetyScore : 24;
                      const eta = Math.round(r.duration / 60);

                      // Calculate hazards avoided
                      const fastestRouteObj = [...route.routes].sort((a: any, b: any) => a.duration - b.duration)[0];
                      const fastestStats = getRouteStats(fastestRouteObj);
                      const avoided = Math.max(0, fastestStats.hazardsCount - stats.hazardsCount);

                      return (
                        <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-3 space-y-1 text-left">
                          <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider block">🛡️ Safe Route (Recommended)</span>
                          <div className="flex justify-between items-baseline">
                            <span className="text-base font-black text-indigo-300">{eta} min</span>
                            <span className="text-[10px] text-white/55">{(r.distance / 1000).toFixed(1)} km</span>
                          </div>
                          <div className="pt-1 border-t border-white/5 flex justify-between text-[10px]">
                            <span className="text-indigo-400">Risk Score:</span>
                            <span className="font-bold text-emerald-400">{riskScore}</span>
                          </div>
                          <div className="text-[9px] text-emerald-400 font-semibold">
                            {avoided > 0 ? `✓ Avoided ${avoided} Hazards` : `Lowest Risk Corridor`}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Government Demo Highlight - Municipal Operational Statement */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[8px] uppercase font-black tracking-widest text-emerald-400">
                    Municipal Operational Statement
                  </span>
                </div>
                <p className="text-[11px] text-emerald-100 font-medium leading-normal">
                  "{municipalStatement}"
                </p>
              </div>

              {/* Municipal Risk Corridor Analytics Card */}
              <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-3.5 space-y-2.5 shadow-xl">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-indigo-400 border-b border-white/5 pb-1">
                  Municipal Risk Corridor Analysis
                </h3>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center py-0.5 border-b border-white/5 border-dashed">
                    <span className="text-white/50 text-[11px]">Average Corridor CRI</span>
                    <span className="font-extrabold text-white">{selectedRouteStats.safetyScore !== null ? averageRouteCRI : "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-white/5 border-dashed">
                    <span className="text-white/50 text-[11px]">Highest Corridor CRI</span>
                    <span className="font-extrabold text-rose-400">{selectedRouteStats.safetyScore !== null ? highestCorridorCRI : "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-white/5 border-dashed">
                    <span className="text-white/50 text-[11px]">Neighborhoods Crossed</span>
                    <span className="font-extrabold text-white">{traversedNeighborhoods.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-white/5 border-dashed">
                    <span className="text-white/50 text-[11px]">Direct Corridor Hazards</span>
                    <span className="font-extrabold text-white">{hazardsCount}</span>
                  </div>
                  {/* Direct hazards is 0 but crossed hotspots -> show nearby hazard clusters */}
                  {selectedRouteStats.safetyScore !== null && selectedRouteCorridorStats.nearbyHazardsCount > 0 && (
                    <div className="flex justify-between items-center py-0.5 border-b border-white/5 border-dashed">
                      <span className="text-white/50 text-[11px]">Nearby Hazard Clusters</span>
                      <span className="font-extrabold text-amber-400">{selectedRouteCorridorStats.nearbyHazardsCount}</span>
                    </div>
                  )}
                  {/* Hide critical zones if 0 */}
                  {selectedRouteStats.safetyScore !== null && criticalZonesCount > 0 && (
                    <div className="flex justify-between items-center py-0.5 border-b border-white/5 border-dashed">
                      <span className="text-white/50 text-[11px]">Critical Zones</span>
                      <span className="font-extrabold text-rose-400">{criticalZonesCount}</span>
                    </div>
                  )}
                  {/* Hide escalations if 0 */}
                  {selectedRouteStats.safetyScore !== null && escalationsNearby > 0 && (
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-white/50 text-[11px]">Escalations Nearby</span>
                      <span className="font-extrabold text-yellow-400">{escalationsNearby}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Neighborhood Intelligence */}
              {traversedNeighborhoods.length > 0 ? (
                <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex justify-between items-center border-b border-white/5 pb-1">
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Neighborhood Risk Exposure</h3>
                    <span className="text-[10px] font-black text-indigo-300">CRI {averageRouteCRI}</span>
                  </div>
                  
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                    {neighborhoodDetails.map((n) => {
                      const isCritical = n.criScore >= 80;
                      const isHigh = n.criScore >= 50 && n.criScore < 80;
                      const criColor = isCritical ? "text-rose-400 bg-rose-500/5 border-rose-500/20" : isHigh ? "text-amber-400 bg-amber-500/5 border-amber-500/20" : "text-emerald-400 bg-emerald-500/5 border-emerald-500/20";
                      
                      return (
                        <div key={n.name} className="p-2 rounded-xl bg-slate-950/60 border border-white/5 flex flex-col gap-1 transition hover:border-white/15">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-white text-[11px] truncate max-w-[130px]">{n.name}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black border ${criColor}`}>
                              CRI {n.criScore}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[9px] text-white/60">
                            <span>Hazards: <strong className="text-white font-bold">{n.activeHazards}</strong></span>
                            <span>Critical: <strong className={n.criticalIssues > 0 ? "text-rose-400 font-bold" : "text-white"}>{n.criticalIssues}</strong></span>
                            <span className={`font-bold uppercase tracking-wider text-[8px] ${
                              n.trend.includes("↑") ? "text-rose-400" : n.trend.includes("↓") ? "text-emerald-400" : "text-white/50"
                            }`}>{n.trend}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-3.5 text-center text-xs text-white/40">
                  No monitored neighborhoods intersected by this route.
                </div>
              )}

              {/* Future Risk Outlook */}
              <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-3.5 space-y-2">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-indigo-400 border-b border-white/5 pb-1">Risk Forecast Engine</h3>
                {forecastDataExists ? (
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-950/60 border border-white/5 p-1 rounded-xl flex flex-col justify-between h-11">
                      <span className="text-[7px] text-white/40 uppercase block font-bold">Current</span>
                      <span className={`font-black text-[9px] block uppercase ${
                        currentRiskLevel === "Low" ? "text-emerald-400" : currentRiskLevel === "Medium" ? "text-amber-400" : "text-rose-400"
                      }`}>{currentRiskLevel}</span>
                    </div>
                    <div className="bg-slate-950/60 border border-white/5 p-1 rounded-xl flex flex-col justify-between h-11">
                      <span className="text-[7px] text-white/40 uppercase block font-bold">Tomorrow</span>
                      <span className={`font-black text-[9px] block uppercase ${
                        forecastRisk24h === "Stable" ? "text-emerald-400" : "text-rose-400"
                      }`}>{forecastRisk24h === "Stable" ? "Low" : "High"}</span>
                    </div>
                    <div className="bg-slate-950/60 border border-white/5 p-1 rounded-xl flex flex-col justify-between h-11">
                      <span className="text-[7px] text-white/40 uppercase block font-bold">7-Day</span>
                      <span className={`font-black text-[9px] block uppercase ${
                        outlook7d === "Stable" ? "text-emerald-400" : outlook7d === "Moderate" ? "text-amber-400" : "text-rose-400"
                      }`}>{outlook7d}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-white/40 text-[10px] text-center py-2 font-bold uppercase tracking-wider">
                    Insufficient forecast data.
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </div>

      {/* 🗺️ RIGHT SIDE: MAP FRAME & SUMMARY */}
      <div className="flex-1 h-full relative flex flex-col min-w-0">
        
        {/* Redesigned Top Intelligence Header Overlay */}
        <div className="absolute top-4 left-4 right-4 z-[1000] bg-slate-950/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-3.5 shadow-2xl text-white">
          
          {/* Title and Settings row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-indigo-400 font-extrabold text-[10px] tracking-widest uppercase bg-indigo-500/10 px-2 py-0.5 border border-indigo-500/20 rounded">
                Route Risk Analysis
              </span>
              <h3 className="font-extrabold text-sm tracking-tight text-white/90">
                {route && selectedRoute ? (
                  hideRouteB
                    ? "Route Verified (No Preferred Route)"
                    : routeRecommendation.recommendedRoute === "No Preferred Route"
                    ? "Routes have equivalent safety profiles (No Preferred Route)"
                    : `Recommended Route: ${routeRecommendation.recommendedRoute}`
                ) : "Route Analysis Mode"}
              </h3>
            </div>
            
            {/* GIS Layer Controls & Weather controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Layers selection */}
              <div className="flex bg-slate-900/60 p-0.5 rounded-lg border border-white/5 text-[9px] font-black uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  className={`px-2 py-1 rounded transition cursor-pointer ${showHeatmap ? "bg-indigo-600 text-white" : "text-white/40 hover:text-white"}`}
                  title="Toggle Municipal Hazard Density Layer"
                >
                  Municipal Hazard Density
                </button>
                <button
                  type="button"
                  onClick={() => setShowMarkers(!showMarkers)}
                  className={`px-2 py-1 rounded transition cursor-pointer ${showMarkers ? "bg-indigo-600 text-white" : "text-white/40 hover:text-white"}`}
                  title="Toggle Infrastructure Hazard Markers"
                >
                  Markers
                </button>
                <button
                  type="button"
                  onClick={() => setShowNeighborhoods(!showNeighborhoods)}
                  className={`px-2 py-1 rounded transition cursor-pointer ${showNeighborhoods ? "bg-indigo-600 text-white" : "text-white/40 hover:text-white"}`}
                  title="Toggle Neighborhood CRI overlays"
                >
                  Neighborhood Layer
                </button>
                <button
                  type="button"
                  onClick={() => setShowRouteSegments(!showRouteSegments)}
                  className={`px-2 py-1 rounded transition cursor-pointer ${showRouteSegments ? "bg-indigo-600 text-white" : "text-white/40 hover:text-white"}`}
                  title="Toggle Risk Segment path colors"
                >
                  Risk Segments
                </button>
              </div>

              {/* Weather controls */}
              <div className="flex bg-slate-900/60 p-0.5 rounded-lg border border-white/5 text-[9px] font-black uppercase tracking-wider">
                {(["clear", "rain", "heat"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setWeather(opt)}
                    className={`px-2.5 py-0.5 rounded transition cursor-pointer ${weather === opt ? "bg-indigo-600 text-white shadow" : "text-white/40 hover:text-white"}`}
                  >
                    {opt === "clear" ? "☀️ Clear" : opt === "rain" ? "🌧️ Rain" : "🔥 Heat"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Details & Executive Summary Row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 text-xs">
            {route && selectedRoute && isDataValid ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start w-full">
                
                {/* Route statistics */}
                <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="space-y-0.5 bg-slate-900/40 p-2 border border-white/5 rounded-xl">
                    <span className="text-[8px] text-white/40 uppercase block font-bold">Distance</span>
                    <span className="font-extrabold text-indigo-300 text-xs block">{(selectedRoute.distance / 1000).toFixed(1)} km</span>
                  </div>
                  <div className="space-y-0.5 bg-slate-900/40 p-2 border border-white/5 rounded-xl">
                    <span className="text-[8px] text-white/40 uppercase block font-bold">ETA</span>
                    <span className="font-extrabold text-white text-xs block">{Math.round(selectedRoute.duration / 60)} min</span>
                  </div>
                  <div className="space-y-0.5 bg-slate-900/40 p-2 border border-white/5 rounded-xl">
                    <span className="text-[8px] text-white/40 uppercase block font-bold">Safety Score</span>
                    <span className="font-black text-emerald-400 text-xs block">
                      {safetyRating !== null ? `${safetyRating}/100` : "Out of Coverage"}
                    </span>
                  </div>
                  <div className="space-y-0.5 bg-slate-900/40 p-2 border border-white/5 rounded-xl">
                    <span className="text-[8px] text-white/40 uppercase block font-bold">Route Status</span>
                    <span className={`font-black text-xs block uppercase ${
                      safetyRating === null ? "text-white/40" :
                      safetyRating >= 85 ? "text-emerald-400 animate-pulse" :
                      safetyRating >= 65 ? "text-amber-400" :
                      "text-rose-400"
                    }`}>
                      {safetyRating === null ? "Out of Coverage" :
                       safetyRating >= 85 ? "🟢 Safe" :
                       safetyRating >= 65 ? "🟡 Monitor" :
                       "🔴 High Risk"}
                    </span>
                  </div>
                  <div className="space-y-0.5 bg-slate-900/40 p-2 border border-white/5 rounded-xl">
                    <span className="text-[8px] text-white/40 uppercase block font-bold">Confidence</span>
                    <span className="font-extrabold text-indigo-300 text-xs block">
                      {selectedRouteStats.coveragePct < 30 ? "Out of Coverage" : `${forecastConfidence}%`}
                    </span>
                  </div>
                  <div className="space-y-0.5 bg-slate-900/40 p-2 border border-white/5 rounded-xl">
                    <span className="text-[8px] text-white/40 uppercase block font-bold">Weather Impact</span>
                    <span className={`font-extrabold text-xs block truncate ${
                      selectedRouteStats.coveragePct < 30 ? "text-white/40" :
                      weatherImpactStats ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {selectedRouteStats.coveragePct < 30 ? "Out of Coverage" :
                       weatherImpactStats ? weatherImpactStats : "Minimal (stable)"}
                    </span>
                  </div>
                </div>

                {/* WHY THIS ROUTE? */}
                <div className="md:col-span-5">
                  {routeRecommendation.recommendedRoute &&
                  routeRecommendation.recommendedRoute !== "No Preferred Route" &&
                  routeRecommendation.reasonsList &&
                  routeRecommendation.reasonsList.length > 0 &&
                  !hideRouteB ? (
                    <div className="bg-indigo-900/10 border border-indigo-500/20 p-2.5 rounded-xl">
                      <h4 className="text-[8px] uppercase font-black text-indigo-400 tracking-wider mb-1 flex items-center gap-1">
                        <span>🧠</span> Why this route is recommended
                      </h4>
                      <div className="space-y-0.5 text-[9px] text-white/80">
                        {routeRecommendation.reasonsList.map((reason, idx) => (
                          <div key={idx} className="flex items-start gap-1">
                            <span className="text-emerald-400 font-bold">✓</span>
                            <span className="leading-tight">{reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-900/40 border border-white/5 p-2.5 rounded-xl flex items-center justify-center h-full text-center">
                      <p className="text-[9px] text-white/40 uppercase font-black tracking-wider">
                        {hideRouteB ? "Only one corridor option" : "Routes have equivalent profiles"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-white/50 font-bold tracking-widest py-1 w-full justify-center uppercase">
                <span>📡 System Active – Awaiting Route Selection</span>
              </div>
            )}
          </div>

        </div>

        {/* Map Container */}
        <div className="flex-1 w-full h-full">
          <MapComponent
            issues={issues}
            route={route}
            routeIssues={displayIssues}
            setRouteIssues={() => {}}
            selectedIssue={selectedIssue}
            mode="driver"
            selectedRouteId={selectedRouteId}
            setSelectedRouteId={setSelectedRouteId}
            areas={filteredMapAreas}
            weather={weather}
            setWeather={setWeather}
            showHeatmap={showHeatmap}
            showMarkers={showMarkers}
            showNeighborhoods={showNeighborhoods}
            showRouteSegments={showRouteSegments}
          />
        </div>
      </div>
      
    </div>
  );
}

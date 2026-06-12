import axios from "axios";
import Issue from "../models/Issue.js";
import RouteHistory from "../models/RouteHistory.js";
import { enrichIssuesWithRiskBatch } from "../controllers/issueController.js";

const NEIGHBORHOOD_COORDS = {
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

const getDistanceFE = (lat1, lon1, lat2, lon2) => {
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

const resolveDestinationName = (lat, lon) => {
  let closestName = null;
  let minDist = Infinity;
  for (const [name, coords] of Object.entries(NEIGHBORHOOD_COORDS)) {
    const d = getDistanceFE(lat, lon, coords[0], coords[1]);
    if (d < minDist) {
      minDist = d;
      closestName = name;
    }
  }
  return minDist <= 3.0 ? closestName : "Unknown Destination";
};

// Helper: Calculate perpendicular distance from a point to a line segment in meters
// Utilizing local flat-Earth projection for extremely fast and accurate 50m measurements
export const getDistanceToSegment = (p, a, b) => {
  const latToMeters = 111139; // approx meters per degree lat
  const lonToMeters = 111139 * Math.cos(a.lat * Math.PI / 180);
  
  const px = p.lon * lonToMeters;
  const py = p.lat * latToMeters;
  const ax = a.lon * lonToMeters;
  const ay = a.lat * latToMeters;
  const bx = b.lon * lonToMeters;
  const by = b.lat * latToMeters;
  
  const dx = bx - ax;
  const dy = by - ay;
  
  if (dx === 0 && dy === 0) {
    return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  }
  
  let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t)); // Clamp to segment boundaries
  
  const closestX = ax + t * dx;
  const closestY = ay + t * dy;
  
  return Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
};

// Helper: Calculate shortest distance from point to a route's polyline path
export const getDistanceToRoute = (p, coords) => {
  let minDistance = Infinity;
  for (let i = 0; i < coords.length - 1; i++) {
    const dist = getDistanceToSegment(p, coords[i], coords[i + 1]);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }
  return minDistance;
};

export const analyzeRouteRisk = async (start, end, startName, endName) => {
  const resolvedEndName = endName || resolveDestinationName(end.lat, end.lon);
  const resolvedStartName = startName || resolveDestinationName(start.lat, start.lon);

  // 1. Fetch routes from OSRM
  const startLon = start.lon;
  const startLat = start.lat;
  const endLon = end.lon;
  const endLat = end.lat;

  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson&alternatives=true`;
  
  let response;
  try {
    response = await axios.get(osrmUrl, { timeout: 10000 });
  } catch (err) {
    throw new Error(`OSRM API failure: ${err.message}`);
  }

  const data = response.data;
  if (!data.routes || data.routes.length === 0) {
    throw new Error("No routes found by OSRM");
  }

  // Map routes
  const rawRoutes = data.routes;
  const routesData = [];

  // If OSRM returns only 1 route, duplicate it for Route B alternative mapping
  const routesToAnalyze = rawRoutes.length >= 2 ? [rawRoutes[0], rawRoutes[1]] : [rawRoutes[0], rawRoutes[0]];

  // Retrieve active issues in bounding box to pre-filter
  // Create broad bounding box covering both routes
  let allCoords = [];
  routesToAnalyze.forEach(r => {
    if (r.geometry && r.geometry.coordinates) {
      r.geometry.coordinates.forEach(c => {
        allCoords.push({ lat: c[1], lon: c[0] });
      });
    }
  });

  if (allCoords.length === 0) {
    throw new Error("Invalid route geometries returned from OSRM");
  }

  const lats = allCoords.map(c => c.lat);
  const lons = allCoords.map(c => c.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  // Retrieve and enrich active issues
  const activeIssuesRaw = await Issue.find({
    status: { $nin: ["resolved", "invalid"] },
    latitude: { $gte: minLat - 0.01, $lte: maxLat + 0.01 },
    longitude: { $gte: minLon - 0.01, $lte: maxLon + 0.01 }
  });

  const activeIssues = await enrichIssuesWithRiskBatch(activeIssuesRaw, "clear");

  // Analyze each route
  for (let idx = 0; idx < routesToAnalyze.length; idx++) {
    const route = routesToAnalyze[idx];
    const routeId = idx === 0 ? "Route A" : "Route B";
    
    // OSRM geometry coordinates are in [longitude, latitude] format
    const routeCoords = route.geometry.coordinates.map(c => ({
      lat: c[1],
      lon: c[0]
    }));

    // Find all issues within 50 meters
    const issuesInCorridor = activeIssues.filter(issue => {
      const p = { lat: issue.latitude, lon: issue.longitude };
      const dist = getDistanceToRoute(p, routeCoords);
      return dist <= 50; // 50 meters
    });

    const routeRisk = issuesInCorridor.reduce((sum, issue) => {
      const risk = issue.riskValue !== undefined ? issue.riskValue : (issue.finalRisk || 0);
      return sum + risk;
    }, 0);

    const criticalIssues = issuesInCorridor.filter(i => i.riskLevel === "Critical" || i.riskScore === "Critical").length;

    routesData.push({
      routeId,
      distance: route.distance, // in meters
      duration: route.duration, // in seconds
      routeRisk,
      criticalIssues,
      geometry: route.geometry,
      issuesInCorridor: issuesInCorridor.map(i => i._id.toString())
    });
  }

  // Post-process Route A vs Route B
  const routeA = routesData[0];
  const routeB = routesData[1];

  // Calculate issues avoided & risk reduction percentages
  // Route A avoids = total corridor issues in B but not in A
  const avoidedByA = routeB.issuesInCorridor.filter(id => !routeA.issuesInCorridor.includes(id)).length;
  const avoidedByB = routeA.issuesInCorridor.filter(id => !routeB.issuesInCorridor.includes(id)).length;

  routeA.issuesAvoided = avoidedByA;
  routeB.issuesAvoided = avoidedByB;

  // Risk reduction percent
  // If we take A, risk reduction relative to B: ((B.risk - A.risk) / B.risk) * 100
  routeA.riskReduction = routeB.routeRisk > 0 ? Math.max(0, Math.round(((routeB.routeRisk - routeA.routeRisk) / routeB.routeRisk) * 100)) : 0;
  routeB.riskReduction = routeA.routeRisk > 0 ? Math.max(0, Math.round(((routeA.routeRisk - routeB.routeRisk) / routeA.routeRisk) * 100)) : 0;

  // Recommendation logic priority:
  // 1. Lower routeRisk
  // 2. Fewer criticalIssues
  // 3. Shorter duration
  let recommendedRouteId = "Route A";
  let recommendationReason = "";

  if (routeA.routeRisk !== routeB.routeRisk) {
    recommendedRouteId = routeA.routeRisk < routeB.routeRisk ? "Route A" : "Route B";
    const riskDiff = Math.abs(routeA.routeRisk - routeB.routeRisk);
    const pct = recommendedRouteId === "Route A" ? routeA.riskReduction : routeB.riskReduction;
    recommendationReason = `${recommendedRouteId} reduces route risk by ${pct}% and avoids cumulative risk score by ${riskDiff} points.`;
  } else if (routeA.criticalIssues !== routeB.criticalIssues) {
    recommendedRouteId = routeA.criticalIssues < routeB.criticalIssues ? "Route A" : "Route B";
    const hazardsAvoided = recommendedRouteId === "Route A" ? routeA.issuesAvoided : routeB.issuesAvoided;
    recommendationReason = `${recommendedRouteId} avoids ${hazardsAvoided} critical hazard(s) along the corridor.`;
  } else {
    recommendedRouteId = routeA.duration < routeB.duration ? "Route A" : "Route B";
    const timeDiff = Math.abs(Math.round((routeA.duration - routeB.duration) / 60));
    recommendationReason = `${recommendedRouteId} is the fastest option by ${timeDiff} minute(s) with equivalent safety profile.`;
  }

  // Set recommendations
  routeA.recommendationReason = recommendedRouteId === "Route A" ? recommendationReason : "";
  routeB.recommendationReason = recommendedRouteId === "Route B" ? recommendationReason : "";
  routeA.isRecommended = recommendedRouteId === "Route A";
  routeB.isRecommended = recommendedRouteId === "Route B";

  // Create RouteHistory log
  const history = await RouteHistory.create({
    startLocation: start,
    endLocation: end,
    startName: resolvedStartName,
    endName: resolvedEndName,
    routeA: {
      distance: routeA.distance,
      duration: routeA.duration,
      routeRisk: routeA.routeRisk,
      criticalIssues: routeA.criticalIssues,
      issuesAvoided: routeA.issuesAvoided,
      riskReduction: routeA.riskReduction,
      recommendationReason: routeA.recommendationReason
    },
    routeB: {
      distance: routeB.distance,
      duration: routeB.duration,
      routeRisk: routeB.routeRisk,
      criticalIssues: routeB.criticalIssues,
      issuesAvoided: routeB.issuesAvoided,
      riskReduction: routeB.riskReduction,
      recommendationReason: routeB.recommendationReason
    },
    recommendedRoute: recommendedRouteId,
    riskReduction: recommendedRouteId === "Route A" ? routeA.riskReduction : routeB.riskReduction
  });

  return {
    routes: [routeA, routeB],
    recommendedRoute: recommendedRouteId,
    historyId: history._id
  };
};

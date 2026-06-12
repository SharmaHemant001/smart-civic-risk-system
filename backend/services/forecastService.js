import Issue from "../models/Issue.js";
import EscalationEvent from "../models/EscalationEvent.js";
import { calculateRiskAfterDays } from "./riskEngine.js";

/**
 * In-memory calculation of nearby active issues to optimize database queries.
 * Matches the LOCATION_RISK_RADIUS = 0.02 logic.
 */
export const computeNearbyCounts = (activeIssues) => {
  const counts = {};
  const cellSize = 0.02;
  const grid = {};

  // Build grid map
  activeIssues.forEach((issue) => {
    const cellX = Math.floor(issue.longitude / cellSize);
    const cellY = Math.floor(issue.latitude / cellSize);
    const cellKey = `${cellX},${cellY}`;
    if (!grid[cellKey]) {
      grid[cellKey] = [];
    }
    grid[cellKey].push(issue);
  });

  // Query nearby counts by looking up adjacent cells only
  activeIssues.forEach((issue) => {
    const cellX = Math.floor(issue.longitude / cellSize);
    const cellY = Math.floor(issue.latitude / cellSize);
    let count = 0;
    const issueId = issue._id.toString();

    // Scan the 9 adjacent grid cells
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const neighborKey = `${cellX + dx},${cellY + dy}`;
        const cellIssues = grid[neighborKey];
        if (cellIssues) {
          cellIssues.forEach((other) => {
            if (other._id.toString() === issueId) return;
            const latDiff = Math.abs(other.latitude - issue.latitude);
            const lonDiff = Math.abs(other.longitude - issue.longitude);
            if (latDiff <= cellSize && lonDiff <= cellSize) {
              count++;
            }
          });
        }
      }
    }
    counts[issueId] = count;
  });

  return counts;
};

/**
 * Calculates city-wide risk forecasts for T in [0, 7, 14, 30] days using SUM.
 */
export const getCityForecast = async (activeIssues, weather = "clear", nearbyCounts = {}) => {
  if (activeIssues.length === 0) {
    return {
      forecasts: {
        "0d": { totalRisk: 0, averageRisk: 0, criticalCount: 0, confidence: 100 },
        "7d": { totalRisk: 0, averageRisk: 0, criticalCount: 0, confidence: 89 },
        "14d": { totalRisk: 0, averageRisk: 0, criticalCount: 0, confidence: 78 },
        "30d": { totalRisk: 0, averageRisk: 0, criticalCount: 0, confidence: 63 },
      },
      growthPercent: 0,
      assumptions: { weather, activeIssues: 0, criticalIssues: 0, horizon: "30 Days" },
    };
  }

  const offsets = [0, 7, 14, 30];
  const forecasts = {};

  const now = new Date();
  const recentCount = await Issue.countDocuments({
    createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
    isDeleted: { $ne: true }
  });
  const olderCount = await Issue.countDocuments({
    createdAt: { 
      $gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), 
      $lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) 
    },
    isDeleted: { $ne: true }
  });

  const historicalTrend = (recentCount - olderCount) / Math.max(1, olderCount);
  const clampedTrend = Math.max(-0.5, Math.min(0.5, historicalTrend));

  const totalOpenCritical = activeIssues.filter(i => i.riskScore === "Critical" || i.riskValue >= 80).length;
  const escalationCount = await EscalationEvent.countDocuments();
  const resolvedCount = await Issue.countDocuments({ status: "resolved", resolvedAt: { $gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) }, isDeleted: { $ne: true } });

  const totalActive = activeIssues.length;
  const dataCompleteness = Math.max(0.5, Math.min(1.0, totalActive / 50));
  const historicalStability = Math.max(0.7, 1.0 - 0.3 * Math.abs(clampedTrend));

  const horizonFactors = {
    "0d": 1.0,
    "7d": 0.89,
    "14d": 0.78,
    "30d": 0.63
  };

  offsets.forEach((days) => {
    let totalRisk = 0;
    let criticalCount = 0;

    activeIssues.forEach((issue) => {
      const nearbyCount = nearbyCounts[issue._id.toString()] || 0;
      const risk = calculateRiskAfterDays(issue, days, weather, nearbyCount);
      const baseValue = risk.finalRisk;
      
      const trendImpact = baseValue * clampedTrend * (days / 30);
      const criticalImpact = (issue.riskLevel === "Critical" ? 2.5 : 0) * (days / 7);
      const escalationImpact = (escalationCount / Math.max(1, activeIssues.length)) * 1.5 * (days / 7);
      const resolutionReduction = (resolvedCount / Math.max(1, activeIssues.length)) * 0.8 * (days / 7);

      const projectedRisk = Math.max(0, Math.min(100, Math.round(baseValue + trendImpact + criticalImpact + escalationImpact - resolutionReduction)));

      totalRisk += projectedRisk;
      if (projectedRisk >= 80) {
        criticalCount += 1;
      }
    });

    const horizonFactor = horizonFactors[`${days}d`];
    const confidence = Math.round(dataCompleteness * historicalStability * horizonFactor * 100);

    forecasts[`${days}d`] = {
      totalRisk: Math.round(totalRisk * 10) / 10,
      averageRisk: Math.round((totalRisk / activeIssues.length) * 10) / 10,
      criticalCount,
      confidence
    };
  });

  const total0 = forecasts["0d"].totalRisk;
  const total30 = forecasts["30d"].totalRisk;
  const growthPercent = total0 > 0 ? Math.round(((total30 - total0) / total0) * 1000) / 10 : 0;

  return {
    forecasts,
    growthPercent,
    assumptions: {
      weather: weather.charAt(0).toUpperCase() + weather.slice(1),
      activeIssues: activeIssues.length,
      criticalIssues: forecasts["0d"].criticalCount,
      horizon: "30 Days",
    },
  };
};

/**
 * Calculates neighborhood CRI forecasts and explanations for T in [0, 7, 14, 30] days.
 */
export const getAreaForecasts = async (activeIssues, weather = "clear", nearbyCounts = {}) => {
  const areaMap = {};

  // Group active issues by neighborhood
  activeIssues.forEach((issue) => {
    const area = issue.locationName || "Unknown";
    if (!areaMap[area]) {
      areaMap[area] = {
        area,
        issues: [],
      };
    }
    areaMap[area].issues.push(issue);
  });

  const areaList = Object.values(areaMap);
  if (areaList.length === 0) return [];

  const maxDensity = Math.max(...areaList.map(a => a.issues.length));
  const offsets = [0, 7, 14, 30];
  const now = new Date();

  // Map to store critical issues count per area at each offset
  const areaOffsetMetrics = await Promise.all(areaList.map(async (item) => {
    const metrics = { area: item.area, totalIssues: item.issues.length, issues: item.issues, offsets: {} };
    
    const recentCount = await Issue.countDocuments({
      locationName: item.area,
      createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      isDeleted: { $ne: true }
    });
    const olderCount = await Issue.countDocuments({
      locationName: item.area,
      createdAt: { 
        $gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), 
        $lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) 
      },
      isDeleted: { $ne: true }
    });

    const historicalTrend = (recentCount - olderCount) / Math.max(1, olderCount);
    const clampedTrend = Math.max(-0.5, Math.min(0.5, historicalTrend));

    const areaEscalations = await EscalationEvent.countDocuments({ clusterId: item.area });
    const areaResolved = await Issue.countDocuments({
      locationName: item.area,
      status: "resolved",
      resolvedAt: { $gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) },
      isDeleted: { $ne: true }
    });

    offsets.forEach((days) => {
      let sumRisk = 0;
      let criticalIssues = 0;

      item.issues.forEach((issue) => {
        const nearbyCount = nearbyCounts[issue._id.toString()] || 0;
        const risk = calculateRiskAfterDays(issue, days, weather, nearbyCount);
        const baseValue = risk.finalRisk;
        
        const trendImpact = baseValue * clampedTrend * (days / 30);
        const criticalImpact = (issue.riskLevel === "Critical" ? 2.5 : 0) * (days / 7);
        const escalationImpact = (areaEscalations / Math.max(1, item.issues.length)) * 1.5 * (days / 7);
        const resolutionReduction = (areaResolved / Math.max(1, item.issues.length)) * 0.8 * (days / 7);

        const projectedRisk = Math.max(0, Math.min(100, Math.round(baseValue + trendImpact + criticalImpact + escalationImpact - resolutionReduction)));

        sumRisk += projectedRisk;
        if (projectedRisk >= 80) {
          criticalIssues += 1;
        }
      });

      metrics.offsets[days] = {
        sumRisk,
        criticalIssues,
        averageRisk: sumRisk / item.issues.length,
      };
    });

    return metrics;
  }));

  // Find max critical counts for each offset to normalize CriticalIssueScore(T)
  const maxCriticalByOffset = {};
  offsets.forEach((days) => {
    maxCriticalByOffset[days] = Math.max(...areaOffsetMetrics.map(m => m.offsets[days].criticalIssues));
  });

  // Calculate normalized CRI forecasts and explainable drivers
  const results = areaOffsetMetrics.map((item) => {
    const criForecasts = {};

    offsets.forEach((days) => {
      const metric = item.offsets[days];
      const densityScore = maxDensity > 0 ? (item.totalIssues / maxDensity) * 100 : 0;
      const maxCritical = maxCriticalByOffset[days];
      const criticalScore = maxCritical > 0 ? (metric.criticalIssues / maxCritical) * 100 : 0;

      const rawCRI = (0.5 * metric.averageRisk) + (0.3 * densityScore) + (0.2 * criticalScore);
      criForecasts[days] = Math.max(0, Math.min(100, Math.round(rawCRI)));
    });

    const currentCRI = criForecasts[0];
    const forecast7Days = criForecasts[7];
    const forecast14Days = criForecasts[14];
    const forecast30Days = criForecasts[30];
    const increasePercent = currentCRI > 0 ? Math.round(((forecast30Days - currentCRI) / currentCRI) * 1000) / 10 : 0;

    // Generate Explainable Causes List
    const typeCounts = {};
    const criticalTypeCounts = {};
    let breachesToday = 0;
    let breaches7Days = 0;

    item.issues.forEach((issue) => {
      typeCounts[issue.issueType] = (typeCounts[issue.issueType] || 0) + 1;
      const nearbyCount = nearbyCounts[issue._id.toString()] || 0;
      const risk = calculateRiskAfterDays(issue, 0, weather, nearbyCount);
      if (risk.finalRisk >= 80) {
        criticalTypeCounts[issue.issueType] = (criticalTypeCounts[issue.issueType] || 0) + 1;
      }

      // Calculate SLA breaches
      let deadline = issue.slaDeadline;
      if (!deadline) {
        const slaDurationHours = {
          Critical: 24,
          High: 72,
          Medium: 72,
          Low: 72,
        }[risk.riskLevel] || 72;
        const created = new Date(issue.createdAt || now);
        deadline = new Date(created.getTime() + slaDurationHours * 60 * 60 * 1000);
      }
      const deadlineTime = new Date(deadline).getTime();
      if (now.getTime() > deadlineTime) {
        breachesToday++;
      }
      if (now.getTime() + 7 * 24 * 60 * 60 * 1000 > deadlineTime) {
        breaches7Days++;
      }
    });

    const drivers = [];
    Object.entries(criticalTypeCounts).forEach(([type, count]) => {
      if (count > 0) {
        drivers.push(`${count} critical ${type}${count > 1 ? "s" : ""}`);
      }
    });

    Object.entries(typeCounts).forEach(([type, count]) => {
      const crit = criticalTypeCounts[type] || 0;
      const nonCrit = count - crit;
      if (nonCrit > 0) {
        drivers.push(`${nonCrit} unresolved ${type}${nonCrit > 1 ? "s" : ""}`);
      }
    });

    if (weather !== "clear") {
      drivers.push(`${weather} scenario selected`);
    }

    if (breaches7Days > breachesToday) {
      drivers.push("SLA breaches increasing");
    }

    if (forecast30Days > currentCRI) {
      drivers.push("increasing time escalation");
    }

    const explanation = `This area's risk is projected to rise because of: ${drivers.join(", ")}.`;

    return {
      area: item.area,
      totalIssues: item.totalIssues,
      currentCRI,
      forecast7Days,
      forecast14Days,
      forecast30Days,
      increasePercent,
      explanation,
      drivers,
    };
  });

  // Sort by 30-day forecast descending
  return results.sort((a, b) => b.forecast30Days - a.forecast30Days);
};

/**
 * Detects emerging risk alerts (CRI increase > 15 within 7 days).
 */
export const getEmergingAlerts = (areaForecasts) => {
  const alerts = [];

  areaForecasts.forEach((item) => {
    const spikePoints = item.forecast7Days - item.currentCRI;
    if (spikePoints > 15) {
      alerts.push({
        area: item.area,
        currentCRI: item.currentCRI,
        forecastCRI: item.forecast7Days,
        increase: Math.round(spikePoints * 10) / 10,
        increasePercent: item.currentCRI > 0 ? Math.round((spikePoints / item.currentCRI) * 1000) / 10 : 0,
        drivers: item.drivers,
      });
    }
  });

  return alerts.sort((a, b) => b.increase - a.increase);
};

/**
 * Generates recommended sets of issues (Top 5, Top 10, Top 20) that reduce city risk the most.
 */
export const getRecommendedInterventions = (activeIssues, weather = "clear", nearbyCounts = {}, cityRisk30d = 0) => {
  if (activeIssues.length === 0 || cityRisk30d === 0) {
    return [
      { name: "Recommended Top 5", expectedReduction: 0, issueIds: [], details: "No issues available" },
      { name: "Recommended Top 10", expectedReduction: 0, issueIds: [], details: "No issues available" },
      { name: "Recommended Top 20", expectedReduction: 0, issueIds: [], details: "No issues available" },
    ];
  }

  // Calculate 30-day risk for each issue
  const sortedIssues = activeIssues.map((issue) => {
    const nearbyCount = nearbyCounts[issue._id.toString()] || 0;
    const risk30d = calculateRiskAfterDays(issue, 30, weather, nearbyCount).finalRisk;
    return {
      id: issue._id.toString(),
      risk30d,
      issueType: issue.issueType,
      locationName: issue.locationName || "Unknown",
    };
  }).sort((a, b) => b.risk30d - a.risk30d);

  const getSetMetrics = (size) => {
    const set = sortedIssues.slice(0, size);
    const riskRemoved = set.reduce((sum, i) => sum + i.risk30d, 0);
    const expectedReduction = Math.round((riskRemoved / cityRisk30d) * 100);
    const types = set.reduce((acc, cur) => {
      acc[cur.issueType] = (acc[cur.issueType] || 0) + 1;
      return acc;
    }, {});
    const typeSummaries = Object.entries(types).map(([type, count]) => `${count} ${type}${count > 1 ? "s" : ""}`).join(", ");

    return {
      name: `Recommended Top ${size}`,
      expectedReduction,
      issueIds: set.map(i => i.id),
      details: `Resolves highest risk threats: ${typeSummaries} across key areas.`,
    };
  };

  return [
    getSetMetrics(5),
    getSetMetrics(10),
    getSetMetrics(20),
  ];
};

export default {
  computeNearbyCounts,
  getCityForecast,
  getAreaForecasts,
  getEmergingAlerts,
  getRecommendedInterventions,
};

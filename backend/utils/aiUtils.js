/**
 * AI Utility Functions for CivicGuard Platform
 * 
 * IMPORTANT: Risk scoring has been moved to services/riskEngine.js
 * This is the ONLY source of truth for risk calculations.
 * 
 * This file contains supporting utilities for:
 * - Geospatial analysis
 * - Text similarity (future ML feature)
 * - Data formatting
 * - Hotspot detection
 * 
 * DO NOT add risk calculations here.
 */

/**
 * Calculate semantic similarity between two text strings (0-1 scale)
 * Foundation for duplicate detection AI
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @returns {number} Similarity score 0-1
 */
export const calculateTextSimilarity = (text1, text2) => {
  if (!text1 || !text2) return 0;
  
  const normalize = (str) => str.toLowerCase().trim();
  const t1 = normalize(text1);
  const t2 = normalize(text2);
  
  if (t1 === t2) return 1;
  
  // Split into words and calculate Jaccard similarity
  const words1 = new Set(t1.split(/\s+/));
  const words2 = new Set(t2.split(/\s+/));
  
  const intersection = [...words1].filter((w) => words2.has(w)).length;
  const union = words1.size + words2.size - intersection;
  
  return union > 0 ? intersection / union : 0;
};

/**
 * Calculate geospatial distance between two coordinates (in kilometers)
 * Used for clustering nearby issues
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Detect anomalies in issue clustering
 * Foundation for hotspot detection
 * @param {Array} issues - Array of issue objects with lat/lon
 * @param {number} radiusKm - Radius to consider for clustering
 * @returns {Array} Detected hotspots with coordinates and issue count
 */
export const detectHotspots = (issues, radiusKm = 1) => {
  if (!issues || issues.length === 0) return [];
  
  const hotspots = [];
  const visited = new Set();
  
  issues.forEach((issue, index) => {
    if (visited.has(index)) return;
    
    const cluster = [issue];
    visited.add(index);
    
    issues.forEach((otherIssue, otherIndex) => {
      if (visited.has(otherIndex)) return;
      
      const distance = calculateDistance(
        issue.latitude,
        issue.longitude,
        otherIssue.latitude,
        otherIssue.longitude
      );
      
      if (distance <= radiusKm) {
        cluster.push(otherIssue);
        visited.add(otherIndex);
      }
    });
    
    if (cluster.length > 1) {
      const avgLat = cluster.reduce((sum, i) => sum + i.latitude, 0) / cluster.length;
      const avgLon = cluster.reduce((sum, i) => sum + i.longitude, 0) / cluster.length;
      
      hotspots.push({
        latitude: avgLat,
        longitude: avgLon,
        issueCount: cluster.length,
        riskLevel: cluster.some((i) => i.riskScore === "Critical")
          ? "Critical"
          : cluster.some((i) => i.riskScore === "High")
          ? "High"
          : "Medium",
        issues: cluster,
      });
    }
  });
  
  return hotspots;
};

/**
 * ⚠️  DEPRECATED: calculateSeverityScore
 * 
 * This function has been removed as part of Phase 1.5 cleanup.
 * All risk calculations are now centralized in:
 *   → backend/services/riskEngine.js
 * 
 * DO NOT use this function. It is kept for reference only.
 * 
 * To calculate risk, use:
 *   import { calculateRisk } from "../services/riskEngine.js";
 *   const result = calculateRisk({ issueType, votes, nearbyIssueCount });
 */
export const calculateSeverityScore = (issue) => {
  console.warn("⚠️  calculateSeverityScore is DEPRECATED. Use riskEngine.calculateRisk() instead.");
  return 0;
};

/**
 * ⚠️  DEPRECATED: predictResolutionPriority
 * 
 * This function has been removed as part of Phase 1.5 cleanup.
 * All risk calculations are now centralized in:
 *   → backend/services/riskEngine.js
 * 
 * DO NOT use this function. It is kept for reference only.
 * 
 * To calculate risk, use:
 *   import { calculateRisk } from "../services/riskEngine.js";
 *   const result = calculateRisk({ issueType, votes, nearbyIssueCount });
 */
export const predictResolutionPriority = (issue) => {
  console.warn("⚠️  predictResolutionPriority is DEPRECATED. Use riskEngine.calculateRisk() instead.");
  if (!issue) return { priority: "LOW", score: 0, reasoning: [] };
  return { priority: "LOW", score: 0, reasoning: ["Use riskEngine instead"] };

/**
 * Extract location context from coordinates
 * Future AI: Get area characteristics, demographics, traffic patterns
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Object} Location context metadata
 */
export const extractLocationContext = (latitude, longitude) => {
  // Placeholder for future ML model integration
  // Will analyze area characteristics from coordinates
  
  return {
    latitude,
    longitude,
    gridCell: `${Math.floor(latitude * 100)}_${Math.floor(longitude * 100)}`,
    timestamp: new Date().toISOString(),
    // Future fields:
    // areaType: "residential" | "commercial" | "industrial"
    // trafficPattern: "low" | "medium" | "high"
    // infrastructureAge: "new" | "maintained" | "aging"
    // populationDensity: "low" | "medium" | "high"
  };
};

/**
 * Validate issue data for AI processing
 * Ensures data quality for ML models
 * @param {Object} issue - Issue object to validate
 * @returns {Object} Validation result with score and warnings
 */
export const validateIssueDataQuality = (issue) => {
  const warnings = [];
  let qualityScore = 100;
  
  if (!issue.imageUrl) {
    warnings.push("Missing image - reduces confidence in AI analysis");
    qualityScore -= 20;
  }
  
  if (!issue.description || issue.description.length < 10) {
    warnings.push("Description too short for semantic analysis");
    qualityScore -= 15;
  }
  
  if (!Number.isFinite(issue.latitude) || !Number.isFinite(issue.longitude)) {
    warnings.push("Invalid coordinates - geospatial analysis not possible");
    qualityScore -= 30;
  }
  
  if (!issue.createdAt) {
    warnings.push("Missing timestamp - temporal analysis limited");
    qualityScore -= 10;
  }
  
  if (!issue.issueType || !["pothole", "garbage", "sewer", "construction", "other"].includes(issue.issueType)) {
    warnings.push("Invalid or missing issue type");
    qualityScore -= 25;
  }
  
  return {
    isValid: qualityScore >= 70,
    qualityScore: Math.max(0, qualityScore),
    warnings,
  };
};

/**
 * Batch process issues for AI pipeline
 * Groups issues for efficient processing
 * @param {Array} issues - Array of issues
 * @param {number} batchSize - Size of each batch
 * @returns {Array} Batches of issues
 */
export const batchProcessIssues = (issues, batchSize = 50) => {
  const batches = [];
  for (let i = 0; i < issues.length; i += batchSize) {
    batches.push(issues.slice(i, i + batchSize));
  }
  return batches;
};

/**
 * Format issue for AI/ML model consumption
 * Standardizes data for model input
 * @param {Object} issue - Raw issue object
 * @returns {Object} Formatted issue for AI processing
 */
export const formatIssueForAI = (issue) => {
  return {
    id: issue._id?.toString?.() || issue.id,
    type: issue.issueType,
    description: (issue.description || "").substring(0, 500), // Truncate for model
    location: {
      latitude: parseFloat(issue.latitude),
      longitude: parseFloat(issue.longitude),
    },
    metadata: {
      voteCount: issue.votes || 0,
      validationScore: issue.validationVotes
        ? (issue.validationVotes.yes || 0) / 
          ((issue.validationVotes.yes || 0) + (issue.validationVotes.no || 0) || 1)
        : 0,
      ageInDays: Math.floor((new Date() - new Date(issue.createdAt)) / (1000 * 60 * 60 * 24)),
      status: issue.status,
    },
    aiReadyIndicator: validateIssueDataQuality(issue).isValid,
  };
};

/**
 * Generate AI-powered recommendation for issue resolution
 * @param {Object} issue - Issue object
 * @param {Array} similarIssues - Similar issues in the area
 * @returns {Object} Recommendation with rationale
 */
export const generateAIRecommendation = (issue, similarIssues = []) => {
  // Note: Risk calculations now happen in riskEngine.js
  // This function is kept for backward compatibility but provides recommendations
  // based on hotspot analysis and cost estimation only
  
  const hotspotAnalysis = detectHotspots([issue, ...similarIssues], 0.5);
  
  return {
    recommendedAction: issue.riskScore === "Critical" ? "immediate" : "schedule",
    priority: issue.riskScore || "MEDIUM", // Use riskScore from riskEngine
    reasoning: [
      `Risk level: ${issue.riskScore}`,
      hotspotAnalysis.length > 0 ? "Located in hotspot area" : "Isolated issue",
    ],
    isHotspotIssue: hotspotAnalysis.length > 0,
    estimatedCost: estimateRepairCost(issue),
    suggestedTimeframe: issue.riskScore === "Critical" ? "1-2 days" : "5-7 days",
    confidence: 0.85, // Placeholder for future ML model confidence
  };
};

/**
 * Estimate repair cost based on issue type and severity
 * @param {Object} issue - Issue object
 * @returns {Object} Cost estimate
 */
export const estimateRepairCost = (issue) => {
  const costRanges = {
    pothole: { min: 500, max: 2000 },
    garbage: { min: 100, max: 500 },
    sewer: { min: 2000, max: 8000 },
    construction: { min: 1000, max: 5000 },
    other: { min: 300, max: 1500 },
  };
  
  const range = costRanges[issue.issueType] || { min: 500, max: 2000 };
  const severityMultiplier = issue.riskScore === "Critical" ? 1.5 : 1;
  
  return {
    estimated: Math.round((range.min + range.max) / 2 * severityMultiplier),
    range: {
      min: Math.round(range.min * severityMultiplier),
      max: Math.round(range.max * severityMultiplier),
    },
    currency: "INR",
  };
};

export default {
  calculateTextSimilarity,
  calculateDistance,
  detectHotspots,
  calculateSeverityScore,
  predictResolutionPriority,
  extractLocationContext,
  validateIssueDataQuality,
  batchProcessIssues,
  formatIssueForAI,
  generateAIRecommendation,
  estimateRepairCost,
};

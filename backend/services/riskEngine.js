/**
 * CivicGuard Risk Engine
 * 
 * CENTRALIZED risk calculation system
 * This is the ONLY place where risk scores are calculated
 * 
 * Risk Formula:
 * BaseRisk = (severity × 0.5) + (frequency × 0.3) + (location × 0.2)
 * FinalRisk = BaseRisk × TimeFactor × WeatherFactor (clamped to 0-100)
 * 
 * Risk Levels:
 * - 80+    → Critical 🔴
 * - 65-79  → High     🟠
 * - 50-64  → Medium   🟡
 * - <50    → Low      🟢
 */

/**
 * Severity scores based on issue type
 */
const SEVERITY_SCORES = {
  sewer: 90,                  // Most disruptive - health hazard
  pothole: 85,                // Vehicle damage, safety hazard
  construction: 70,           // Hazardous but temporary
  garbage: 55,                // Hygiene issue but less immediate
  flooding: 95,               // Severe disaster/flooding
  water_leakage: 75,          // Utility hazard
  open_manhole: 90,           // Immediate public safety hazard
  streetlight_failure: 60,    // Safety risk in dark
  road_damage: 85,            // Vehicle/traffic risk
  infrastructure_damage: 80,  // Infrastructure damage hazard
  public_safety_hazard: 90,   // Public safety hazard
  other: 50,                  // Custom or miscellaneous complaints
};

const SEVERITY_MAP = {
  Low: 40,
  Medium: 60,
  High: 80,
  Critical: 100,
};

const getAutomaticLocationPriority = (affectedArea) => {
  switch (affectedArea) {
    case "School Zone":
    case "Hospital Zone":
    case "Government Facility":
      return "High";
    case "Market Area":
    case "Residential Area":
    case "Public Utility":
      return "Medium";
    default:
      return "Low";
  }
};

/**
 * Calculate severity score (0-100) based on issue type
 */
const calculateSeverityScore = (issueType) => {
  return SEVERITY_SCORES[issueType] ?? 50;
};

/**
 * Calculate frequency score (0-100+) based on community votes
 * Each vote = 10 points
 */
const calculateFrequencyScore = (votes = 0, communityConfirmations = 0) => {
  const numVotes = Math.max(Number(votes) || 0, 0);
  const numConfirmations = Math.max(Number(communityConfirmations) || 0, 0);
  return numVotes * 10 + numConfirmations * 15;
};

/**
 * Calculate location weight (0-100) based on nearby issue density
 */
const calculateLocationWeight = (nearbyIssueCount = 0) => {
  const count = Math.max(Number(nearbyIssueCount) || 0, 0);
  
  if (count >= 5) return 100;   // Severe concentration
  if (count >= 3) return 75;    // High concentration
  if (count >= 2) return 55;    // Moderate concentration
  if (count >= 1) return 35;    // Some issues nearby
  return 15;                     // Isolated issue
};

/**
 * Clamp a value to 0-100 range with rounding
 */
const clampScore = (value) => Math.max(0, Math.min(100, Math.round(value)));

/**
 * Determine risk level from numerical score
 */
export const getRiskLevel = (riskValue) => {
  if (riskValue >= 80) return "Critical";
  if (riskValue >= 65) return "High";
  if (riskValue >= 50) return "Medium";
  return "Low";
};

/**
 * Calculate days unresolved from createdAt timestamp
 */
const getDaysUnresolved = (createdAt) => {
  if (!createdAt) return 0;
  const now = new Date();
  const created = new Date(createdAt);
  const diffTime = Math.max(0, now.getTime() - created.getTime());
  return diffTime / (1000 * 60 * 60 * 24);
};

/**
 * Generate human-readable explanation for a risk score
 */
export const generateExplanation = (issueType, riskLevel, score, votes = 0, nearbyCount = 0, days = 0, weather = "clear") => {
  const explanations = [];

  const typeText = issueType === "other" ? "civic issue" : `${issueType} issue`;
  explanations.push(`a ${riskLevel.toLowerCase()} ${typeText}`);

  if (votes > 0) {
    explanations.push(`with ${votes} community confirmation${votes !== 1 ? "s" : ""}`);
  }

  if (nearbyCount >= 5) {
    explanations.push(`located inside a high-density civic risk cluster`);
  } else if (nearbyCount >= 3) {
    explanations.push(`located inside a moderate-density civic risk cluster`);
  } else if (nearbyCount >= 1) {
    explanations.push(`located near other active reports`);
  }

  const roundedDays = Math.round(days);
  if (roundedDays > 0) {
    explanations.push(`unresolved for ${roundedDays} day${roundedDays !== 1 ? "s" : ""}`);
  }

  const lowerWeather = (weather || "clear").toLowerCase();
  if (lowerWeather === "rain") {
    explanations.push(`while rain conditions increase projected impact`);
  } else if (lowerWeather === "heat") {
    explanations.push(`while heatwave conditions accelerate risks`);
  }

  const listText = explanations.join(", ");
  return `This issue scored ${score} because it is ${listText}.`;
};

/**
 * MAIN API: Calculate complete dynamic risk assessment
 * 
 * @param {Object} params - Calculation parameters
 * @param {string} params.issueType - Type of issue (pothole, garbage, sewer, construction)
 * @param {number} params.votes - Number of community votes
 * @param {number} params.nearbyIssueCount - Number of similar issues nearby
 * @param {number} params.daysUnresolved - Time since reporting in days
 * @param {string} params.weather - Weather mode (clear, rain, heat)
 * @returns {Object} Dynamic risk assessment with breakdown and explanation
 */
export const calculateRisk = ({
  issueType,
  votes = 0,
  nearbyIssueCount = 0,
  daysUnresolved = 0,
  weather = "clear",
  severity,
  communityConfirmations = 0,
  affectedArea,
  isEscalated = false,
  historicalActivity = 0,
}) => {
  // 1. Automatic Location Priority
  let priorityModifier = 0;
  if (affectedArea) {
    const locationPriority = getAutomaticLocationPriority(affectedArea);
    const priorityModifiers = {
      High: 15,
      Medium: 5,
      Low: -10,
    };
    priorityModifier = priorityModifiers[locationPriority] ?? 0;
  }

  // 2. Base Components
  const categorySeverity = SEVERITY_SCORES[issueType] ?? 50;
  const severityScore = SEVERITY_MAP[severity] ?? categorySeverity;
  const frequency = calculateFrequencyScore(votes, communityConfirmations);
  const location = calculateLocationWeight(nearbyIssueCount);

  // 3. BaseRisk calculation
  let rawBaseRisk = severityScore * 0.5 + frequency * 0.3 + location * 0.2;

  // 4. Escalations active
  if (isEscalated) {
    rawBaseRisk += 15;
  }

  // 5. Location priority modifier
  rawBaseRisk += priorityModifier;

  // 6. Historical Activity modifier
  if (historicalActivity > 10) {
    rawBaseRisk += 5;
  }

  const baseRisk = clampScore(rawBaseRisk);

  // 7. Time Escalation Factor (1 + unresolved days / 30, capped at 2.0)
  const days = Math.max(0, Number(daysUnresolved) || 0);
  const timeFactor = Math.min(2.0, 1 + (days / 30));

  // 8. Weather Multipliers (Applied exactly once, no additive modifiers)
  let weatherFactor = 1.0;
  const lowerWeather = (weather || "clear").toLowerCase();
  if (lowerWeather === "rain") {
    if (issueType === "sewer") weatherFactor = 1.5;
    else if (issueType === "public_safety_hazard") weatherFactor = 1.5;
    else if (issueType === "pothole") weatherFactor = 1.4;
    else if (issueType === "infrastructure_damage") weatherFactor = 1.4;
  } else if (lowerWeather === "heat") {
    if (issueType === "garbage") weatherFactor = 1.3;
    else if (issueType === "public_safety_hazard") weatherFactor = 1.3;
    else if (issueType === "infrastructure_damage") weatherFactor = 1.2;
  }

  // 9. FinalRisk
  const rawFinalRisk = baseRisk * timeFactor * weatherFactor;
  const finalRisk = clampScore(rawFinalRisk);

  // 10. Risk Level
  const riskLevel = getRiskLevel(finalRisk);

  // 11. Calculate contributions for the flat breakdown (No client-side reconstruction needed)
  let sevContrib = Math.round(severityScore * 0.5);
  let freqContrib = Math.round(frequency * 0.3);
  let densContrib = Math.round(location * 0.2 + priorityModifier + (historicalActivity > 10 ? 5 : 0));
  let escContrib = isEscalated ? 15 : 0;

  // Ensure base contributions sum to baseRisk
  const baseSum = sevContrib + freqContrib + densContrib + escContrib;
  if (baseSum > baseRisk && baseSum > 0) {
    const scale = baseRisk / baseSum;
    sevContrib = Math.round(sevContrib * scale);
    freqContrib = Math.round(freqContrib * scale);
    densContrib = Math.round(densContrib * scale);
    escContrib = Math.round(escContrib * scale);
  }

  let persContrib = Math.round(baseRisk * (timeFactor - 1.0));
  let weathContrib = Math.round((baseRisk * timeFactor) * (weatherFactor - 1.0));

  // Ensure total contributions sum to finalRisk
  const totalSum = sevContrib + freqContrib + densContrib + escContrib + persContrib + weathContrib;
  if (totalSum !== finalRisk && totalSum > 0) {
    const scale = finalRisk / totalSum;
    sevContrib = Math.round(sevContrib * scale);
    freqContrib = Math.round(freqContrib * scale);
    densContrib = Math.round(densContrib * scale);
    escContrib = Math.round(escContrib * scale);
    persContrib = Math.round(persContrib * scale);
    weathContrib = Math.round(weathContrib * scale);
    
    // Final check for rounding errors to make it match exactly
    const adjustedSum = sevContrib + freqContrib + densContrib + escContrib + persContrib + weathContrib;
    const diff = finalRisk - adjustedSum;
    if (diff !== 0) {
      if (weathContrib > 0) weathContrib += diff;
      else if (persContrib > 0) persContrib += diff;
      else if (densContrib > 0) densContrib += diff;
      else if (sevContrib > 0) sevContrib += diff;
    }
  }

  const breakdown = {
    severity: sevContrib,
    frequency: freqContrib,
    density: densContrib,
    persistence: persContrib,
    weather: weathContrib,
    
    severityContribution: sevContrib,
    frequencyContribution: freqContrib,
    densityContribution: densContrib,
    escalationContribution: escContrib,
    persistenceContribution: persContrib,
    weatherContribution: weathContrib,
    
    severityBase: severityScore,
    frequencyBase: frequency,
    densityBase: location,
    timeFactor: Math.round(timeFactor * 100) / 100,
    weatherFactor,
    finalRisk,
  };

  // 8. Human explanation
  const explanation = generateExplanation(issueType, riskLevel, finalRisk, votes, nearbyIssueCount, days, weather);

  // 9. Timeline progression predictions
  const timeFactorPlus7 = Math.min(2.0, 1 + ((days + 7) / 30));
  const riskAfter7Days = clampScore(baseRisk * timeFactorPlus7 * weatherFactor);

  const timeFactorPlus14 = Math.min(2.0, 1 + ((days + 14) / 30));
  const riskAfter14Days = clampScore(baseRisk * timeFactorPlus14 * weatherFactor);

  return {
    baseRisk,
    timeFactor: Math.round(timeFactor * 100) / 100,
    weatherFactor,
    finalRisk,
    riskLevel,
    breakdown,
    explanation,
    timeline: {
      currentRisk: finalRisk,
      riskAfter7Days,
      riskAfter14Days,
    },
  };
};

/**
 * Validate input parameters
 */
export const validateRiskInput = ({ issueType, votes, nearbyIssueCount }) => {
  const errors = [];

  const allowedTypes = ["pothole", "sewer", "garbage", "construction", "infrastructure_damage", "public_safety_hazard", "other"];
  if (!issueType || !allowedTypes.includes(issueType)) {
    errors.push(`Invalid issueType: ${issueType}`);
  }

  if (votes !== undefined && (typeof votes !== "number" || votes < 0)) {
    errors.push(`Invalid votes: ${votes} (must be number >= 0)`);
  }

  if (nearbyIssueCount !== undefined && (typeof nearbyIssueCount !== "number" || nearbyIssueCount < 0)) {
    errors.push(`Invalid nearbyIssueCount: ${nearbyIssueCount} (must be number >= 0)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Get risk configuration
 */
export const getRiskConfig = () => ({
  levels: {
    critical: { min: 80, max: 100, label: "Critical", color: "#ef4444" },
    high: { min: 65, max: 79, label: "High", color: "#f97316" },
    medium: { min: 50, max: 64, label: "Medium", color: "#facc15" },
    low: { min: 0, max: 49, label: "Low", color: "#22c55e" },
  },
  issueTypes: {
    sewer: { severity: 90, label: "Sewer Issue", icon: "🚰" },
    pothole: { severity: 85, label: "Pothole", icon: "🕳️" },
    construction: { severity: 70, label: "Construction Hazard", icon: "🏗️" },
    garbage: { severity: 55, label: "Garbage", icon: "🗑️" },
    infrastructure_damage: { severity: 80, label: "Infrastructure Damage", icon: "🚧" },
    public_safety_hazard: { severity: 90, label: "Public Safety Hazard", icon: "⚠️" },
    other: { severity: 50, label: "Other Hazard", icon: "📋" },
  },
  weights: {
    severity: 0.5,
    frequency: 0.3,
    location: 0.2,
  },
});

/**
 * Compare two issues by risk
 */
export const compareByRisk = (issueA, issueB) => {
  const levelOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  const aLevel = levelOrder[issueA.riskScore] ?? 4;
  const bLevel = levelOrder[issueB.riskScore] ?? 4;

  if (aLevel !== bLevel) return aLevel - bLevel;

  const aScore = Number(issueA.riskValue) || 0;
  const bScore = Number(issueB.riskValue) || 0;

  if (aScore !== bScore) return bScore - aScore;

  const aVotes = Number(issueA.votes) || 0;
  const bVotes = Number(issueB.votes) || 0;

  return bVotes - aVotes;
};

/**
 * Timeline calculation helpers
 */
export const calculateRiskToday = (issue, weather = "clear", nearbyIssueCount = 0) => {
  return calculateRisk({
    issueType: issue.issueType,
    votes: issue.votes,
    nearbyIssueCount,
    daysUnresolved: getDaysUnresolved(issue.createdAt),
    weather,
    severity: issue.severity,
    communityConfirmations: issue.communityConfirmations,
    affectedArea: issue.affectedArea,
  });
};

export const calculateRiskAfterDays = (issue, days, weather = "clear", nearbyIssueCount = 0) => {
  return calculateRisk({
    issueType: issue.issueType,
    votes: issue.votes,
    nearbyIssueCount,
    daysUnresolved: getDaysUnresolved(issue.createdAt) + days,
    weather,
    severity: issue.severity,
    communityConfirmations: issue.communityConfirmations,
    affectedArea: issue.affectedArea,
  });
};

export const _testHelpers = {
  calculateSeverityScore,
  calculateFrequencyScore,
  calculateLocationWeight,
  getDaysUnresolved,
  clampScore,
};

export default {
  calculateRisk,
  validateRiskInput,
  getRiskConfig,
  compareByRisk,
  calculateRiskToday,
  calculateRiskAfterDays,
};

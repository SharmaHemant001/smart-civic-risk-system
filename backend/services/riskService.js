const SEVERITY_BY_TYPE = {
  sewer: 90,
  pothole: 85,
  construction: 70,
  garbage: 55,
};

const clampScore = (value) => Math.max(0, Math.min(100, Math.round(value)));

export const getSeverityScore = (issueType) =>
  SEVERITY_BY_TYPE[issueType] ?? 50;

export const getFrequencyScore = (votes) =>
  clampScore(Math.max(Number(votes) || 0, 0) * 10);

export const getLocationWeight = (nearbyIssueCount) => {
  if (nearbyIssueCount >= 5) return 100;
  if (nearbyIssueCount >= 3) return 75;
  if (nearbyIssueCount >= 2) return 55;
  if (nearbyIssueCount >= 1) return 35;
  return 15;
};

export const getRiskLevel = (riskValue) => {
  if (riskValue >= 80) return "Critical";
  if (riskValue >= 50) return "Medium";
  return "Low";
};

export const calculateRisk = ({
  issueType,
  votes = 0,
  nearbyIssueCount = 0,
}) => {
  const severity = getSeverityScore(issueType);
  const frequency = getFrequencyScore(votes);
  const locationWeight = getLocationWeight(nearbyIssueCount);

  const riskValue = clampScore(
    severity * 0.5 + frequency * 0.3 + locationWeight * 0.2
  );

  return {
    riskValue,
    riskScore: getRiskLevel(riskValue),
    factors: {
      severity,
      frequency,
      locationWeight,
    },
  };
};

export const calculateRisk = (issueType, votes) => {
  let baseRisk;

  if (issueType === "pothole" || issueType === "sewer") {
    baseRisk = "High";
  } else if (issueType === "garbage") {
    baseRisk = "Medium";
  } else {
    baseRisk = "Low";
  }

  // Escalate risk based on votes
  if (votes > 10) return "High";
  if (votes > 5) return "Medium";

  return baseRisk;
};
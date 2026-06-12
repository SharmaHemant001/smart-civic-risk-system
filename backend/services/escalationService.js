import Issue from "../models/Issue.js";
import EscalationEvent from "../models/EscalationEvent.js";
import { enrichIssuesWithRiskBatch } from "../controllers/issueController.js";

export const checkEscalationEvents = async () => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  // 1. Fetch active issues reported in the last 1 hour
  const recentIssuesRaw = await Issue.find({
    createdAt: { $gte: oneHourAgo },
    status: { $nin: ["resolved", "invalid"] }
  });

  if (recentIssuesRaw.length === 0) {
    return []; // No new reports
  }

  // Group by locationName
  const grouped = {};
  recentIssuesRaw.forEach(issue => {
    const loc = issue.locationName || "Unknown";
    if (!grouped[loc]) grouped[loc] = [];
    grouped[loc].push(issue);
  });

  const newEvents = [];

  for (const [locationName, recentIssues] of Object.entries(grouped)) {
    // Trigger condition: 3+ reports within last hour
    if (recentIssues.length < 3) {
      continue;
    }

    // Anti-spam check: has an EscalationEvent been triggered for this cluster in the last hour?
    const existingEvent = await EscalationEvent.findOne({
      clusterId: locationName,
      timestamp: { $gte: oneHourAgo }
    });
    if (existingEvent) {
      continue;
    }

    // Fetch all active issues in this location
    const allActiveRaw = await Issue.find({
      locationName,
      status: { $nin: ["resolved", "invalid"] }
    });

    const allActiveEnriched = await enrichIssuesWithRiskBatch(allActiveRaw, "clear");

    // Separate issues reported in last hour vs earlier
    const newEnrichedIssues = allActiveEnriched.filter(i => new Date(i.createdAt) >= oneHourAgo);
    
    const newRisk = allActiveEnriched.reduce((sum, i) => sum + (i.riskValue || 0), 0);
    const newIssuesRisk = newEnrichedIssues.reduce((sum, i) => sum + (i.riskValue || 0), 0);
    const oldRisk = Math.max(0, newRisk - newIssuesRisk);

    let riskIncrease = 0;
    if (oldRisk === 0) {
      riskIncrease = newRisk > 0 ? 100 : 0;
    } else {
      riskIncrease = Math.round(((newRisk - oldRisk) / oldRisk) * 100);
    }

    // Set status based on increase percentage
    let status = "Info";
    if (riskIncrease >= 25) status = "Critical";
    else if (riskIncrease >= 10) status = "Warning";

    // Trend direction
    const trendDirection = riskIncrease > 0 ? "Increasing" : (riskIncrease < 0 ? "Decreasing" : "Stable");

    // Group issue types for description
    const typeCounts = {};
    newEnrichedIssues.forEach(i => {
      typeCounts[i.issueType] = (typeCounts[i.issueType] || 0) + 1;
    });

    const typeStrings = Object.entries(typeCounts).map(([type, count]) => `${count} new ${type}`);
    const typeSummary = typeStrings.join(" and ") + " report(s)";
    const message = `Risk in ${locationName} increased by ${riskIncrease}% due to ${typeSummary} in the last hour.`;

    const event = await EscalationEvent.create({
      clusterId: locationName,
      oldRisk,
      newRisk,
      riskIncrease,
      issueCount: newEnrichedIssues.length,
      issueTypes: Object.keys(typeCounts),
      status,
      trendDirection,
      message,
      timestamp: new Date()
    });

    newEvents.push(event);
  }

  return newEvents;
};

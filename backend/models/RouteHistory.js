import mongoose from "mongoose";

const routeHistorySchema = new mongoose.Schema({
  startLocation: {
    lat: { type: Number, required: true },
    lon: { type: Number, required: true }
  },
  endLocation: {
    lat: { type: Number, required: true },
    lon: { type: Number, required: true }
  },
  startName: { type: String },
  endName: { type: String },
  routeA: {
    distance: { type: Number },
    duration: { type: Number },
    routeRisk: { type: Number },
    criticalIssues: { type: Number },
    issuesAvoided: { type: Number },
    riskReduction: { type: Number },
    recommendationReason: { type: String }
  },
  routeB: {
    distance: { type: Number },
    duration: { type: Number },
    routeRisk: { type: Number },
    criticalIssues: { type: Number },
    issuesAvoided: { type: Number },
    riskReduction: { type: Number },
    recommendationReason: { type: String }
  },
  recommendedRoute: { type: String, required: true },
  riskReduction: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now }
});

routeHistorySchema.index({ timestamp: -1 });
routeHistorySchema.index({ recommendedRoute: 1 });

export default mongoose.model("RouteHistory", routeHistorySchema);

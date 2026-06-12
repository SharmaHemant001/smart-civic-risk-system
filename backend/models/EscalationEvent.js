import mongoose from "mongoose";

const escalationEventSchema = new mongoose.Schema({
  clusterId: { type: String, required: true }, // locationName
  oldRisk: { type: Number, required: true },
  newRisk: { type: Number, required: true },
  riskIncrease: { type: Number, required: true }, // percentage increase
  issueCount: { type: Number, required: true },
  issueTypes: [{ type: String }],
  status: { 
    type: String, 
    enum: ["Info", "Warning", "Critical"], 
    default: "Info" 
  },
  trendDirection: {
    type: String,
    enum: ["Increasing", "Stable", "Decreasing"],
    default: "Stable"
  },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

escalationEventSchema.index({ clusterId: 1 });
escalationEventSchema.index({ timestamp: -1 });
escalationEventSchema.index({ status: 1 });

export default mongoose.model("EscalationEvent", escalationEventSchema);

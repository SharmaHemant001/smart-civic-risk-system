import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",
    default: null
  },
  email: { type: String, default: null },
  role: { type: String, default: "Anonymous" },
  action: { type: String, required: true },
  entityType: { type: String, default: null },
  entityId: { type: String, default: null },
  severity: { 
    type: String, 
    enum: ["INFO", "WARNING", "CRITICAL"], 
    default: "INFO" 
  },
  timestamp: { type: Date, default: Date.now },
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null }
});

auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ action: 1 });

export default mongoose.model("AuditLog", auditLogSchema);

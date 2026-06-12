import AuditLog from "../models/AuditLog.js";

/**
 * Creates an audit log entry.
 */
export const logAudit = async ({
  userId = null,
  email = null,
  role = "Anonymous",
  action,
  entityType = null,
  entityId = null,
  severity = "INFO",
  ipAddress = "127.0.0.1"
}) => {
  try {
    const entry = await AuditLog.create({
      userId,
      email,
      role,
      action,
      entityType,
      entityId: entityId ? entityId.toString() : null,
      severity,
      ipAddress
    });
    console.log(`[AUDIT LOG] ${action} (${severity}) by ${email || "Anonymous"} [IP: ${ipAddress}]`);
    return entry;
  } catch (err) {
    console.error("🔥 Audit Logging Error:", err.message);
  }
};

export default logAudit;

const AuditLog = require('../models/AuditLog');

const logAuditEvent = async (data) => {
  try {
    const event = {
      userId: data.userId,
      workspaceId: data.workspaceId,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      metadata: data.metadata || {},
      requestId: data.requestId || null
    };

    await AuditLog.create(event);
    return event;
  } catch (err) {
    console.error('[Audit] Failed to log event:', err.message);
    return null;
  }
};

module.exports = { logAuditEvent };
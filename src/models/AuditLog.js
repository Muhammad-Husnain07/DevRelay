const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: {
    type: String,
    required: true,
    enum: [
      'api_key_created',
      'api_key_revoked',
      'secret_rotated',
      'member_added',
      'member_removed',
      'role_updated',
      'workspace_created',
      'workspace_deleted',
      'endpoint_created',
      'endpoint_deleted',
      'webhook_dispatched',
      'job_enqueued',
      'login_success',
      'login_failed'
    ]
  },
  resource: { type: String, default: null },
  resourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  requestId: { type: String, default: null }
}, { timestamps: true });

auditLogSchema.index({ workspaceId: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
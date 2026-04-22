const mongoose = require('mongoose');

const alertRuleSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  condition: {
    metric: { type: String, enum: ['webhook_failure_rate', 'job_failure_rate', 'queue_depth', 'endpoint_consecutive_failures', 'cron_missed'], required: true },
    operator: { type: String, enum: ['gt', 'lt', 'gte', 'lte', 'eq'], required: true },
    threshold: { type: Number, required: true },
    windowMinutes: { type: Number, default: 5 }
  },
  severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'warning' },
  channels: [{
    type: { type: String, enum: ['email', 'webhook'], required: true },
    config: { type: mongoose.Schema.Types.Mixed, required: true }
  }],
  cooldownMinutes: { type: Number, default: 60 },
  isActive: { type: Boolean, default: true },
  lastFiredAt: { type: Date, default: null }
}, { timestamps: true });

alertRuleSchema.index({ workspaceId: 1, isActive: 1 });

module.exports = mongoose.model('AlertRule', alertRuleSchema);
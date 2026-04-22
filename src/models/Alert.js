const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  ruleId: { type: mongoose.Schema.Types.ObjectId, ref: 'AlertRule', required: true },
  severity: { type: String, enum: ['info', 'warning', 'critical'], required: true },
  message: { type: String, required: true },
  metric: { type: String, required: true },
  value: { type: Number, required: true },
  threshold: { type: Number, required: true },
  status: { type: String, enum: ['firing', 'resolved'], default: 'firing' },
  resolvedAt: { type: Date, default: null }
}, { timestamps: true });

alertSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });
alertSchema.index({ ruleId: 1 });

module.exports = mongoose.model('Alert', alertSchema);
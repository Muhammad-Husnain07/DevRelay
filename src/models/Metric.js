const mongoose = require('mongoose');

const metricSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  date: { type: Date, required: true },
  deliveriesTotal: { type: Number, default: 0 },
  deliveriesSuccess: { type: Number, default: 0 },
  deliveriesFailed: { type: Number, default: 0 },
  jobsTotal: { type: Number, default: 0 },
  jobsSuccess: { type: Number, default: 0 },
  jobsFailed: { type: Number, default: 0 },
  emailsSent: { type: Number, default: 0 },
  cronFires: { type: Number, default: 0 },
  avgDeliveryLatency: { type: Number, default: 0 },
  avgJobDuration: { type: Number, default: 0 }
}, { timestamps: true });

metricSchema.index({ workspaceId: 1, date: 1 }, { unique: true });
metricSchema.index({ workspaceId: 1, date: -1 });

module.exports = mongoose.model('Metric', metricSchema);
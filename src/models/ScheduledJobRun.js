const mongoose = require('mongoose');

const scheduledJobRunSchema = new mongoose.Schema({
  scheduledJobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ScheduledJob',
    required: true,
    index: true
  },
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  triggeredAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  duration: {
    type: Number
  },
  status: {
    type: String,
    enum: ['success', 'failed'],
    required: true
  },
  error: {
    type: String
  },
  actionResult: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

scheduledJobRunSchema.index({ scheduledJobId: 1, triggeredAt: -1 });
scheduledJobRunSchema.index({ workspaceId: 1, triggeredAt: -1 });

module.exports = mongoose.model('ScheduledJobRun', scheduledJobRunSchema);
const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  definitionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobDefinition'
  },
  name: {
    type: String,
    required: true,
    index: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  priority: {
    type: Number,
    default: 3,
    index: true
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'completed', 'failed', 'delayed', 'paused'],
    default: 'waiting',
    index: true
  },
  bullJobId: {
    type: String
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  result: {
    type: mongoose.Schema.Types.Mixed
  },
  error: {
    type: String
  },
  stackTrace: {
    type: String
  },
  scheduledFor: {
    type: Date
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  failedAt: {
    type: Date
  },
  duration: {
    type: Number
  }
}, {
  timestamps: true
});

jobSchema.index({ workspaceId: 1, status: 1 });
jobSchema.index({ workspaceId: 1, createdAt: -1 });
jobSchema.index({ workspaceId: 1, name: 1 });

jobSchema.methods.markStarted = async function() {
  this.status = 'active';
  this.startedAt = new Date();
  this.attempts += 1;
  await this.save();
};

jobSchema.methods.markCompleted = async function(result) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.result = result;
  this.duration = this.completedAt - this.startedAt;
  await this.save();
};

jobSchema.methods.markFailed = async function(error, stackTrace) {
  this.status = 'failed';
  this.failedAt = new Date();
  this.error = error;
  this.stackTrace = stackTrace;
  await this.save();
};

jobSchema.methods.getPublic = function() {
  return {
    id: this._id,
    workspaceId: this.workspaceId,
    definitionId: this.definitionId,
    name: this.name,
    payload: this.payload,
    priority: this.priority,
    status: this.status,
    attempts: this.attempts,
    maxAttempts: this.maxAttempts,
    result: this.status === 'completed' ? this.result : undefined,
    error: this.status === 'failed' ? this.error : undefined,
    scheduledFor: this.scheduledFor,
    startedAt: this.startedAt,
    completedAt: this.completedAt,
    duration: this.duration,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const PRIORITY_MAP = {
  critical: 1,
  high: 2,
  normal: 3,
  low: 4
};

jobSchema.statics.getPriorityNumber = function(priorityString) {
  return PRIORITY_MAP[priorityString] || 3;
};

module.exports = mongoose.model('Job', jobSchema);
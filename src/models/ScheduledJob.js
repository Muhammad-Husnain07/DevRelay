const mongoose = require('mongoose');
const cron = require('node-cron');

const scheduledJobSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  cronExpression: {
    type: String,
    required: true
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  action: {
    type: {
      type: String,
      enum: ['http-request', 'enqueue-job', 'webhook-event'],
      required: true
    },
    config: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastRunAt: {
    type: Date
  },
  lastRunStatus: {
    type: String,
    enum: ['success', 'failed', 'skipped'],
    default: null
  },
  lastRunError: {
    type: String
  },
  nextRunAt: {
    type: Date
  },
  consecutiveFailures: {
    type: Number,
    default: 0
  },
  runCount: {
    type: Number,
    default: 0
  },
  maxConsecutiveFailures: {
    type: Number,
    default: 5
  },
  timeout: {
    type: Number,
    default: 30000
  }
}, {
  timestamps: true
});

scheduledJobSchema.index({ workspaceId: 1, isActive: 1 });

scheduledJobSchema.methods.validateCron = function() {
  try {
    const isValid = cron.validate(this.cronExpression);
    return { valid: isValid };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

scheduledJobSchema.methods.calculateNextRun = function() {
  try {
    if (!cron.validate(this.cronExpression)) {
      return null;
    }
    
    const cronParts = this.cronExpression.split(' ');
    const now = new Date();
    
    let next = new Date(now.getTime() + 60000);
    
    const interval = setInterval(() => {
      if (next > now) {
        clearInterval(interval);
        this.nextRunAt = next;
      }
    }, 10);
    
    setTimeout(() => clearInterval(interval), 100);
    
    return this.nextRunAt;
  } catch (error) {
    return null;
  }
};

scheduledJobSchema.methods.markSuccess = async function(result) {
  this.lastRunStatus = 'success';
  this.lastRunAt = new Date();
  this.lastRunError = null;
  this.consecutiveFailures = 0;
  this.runCount += 1;
  await this.save();
};

scheduledJobSchema.methods.markFailed = async function(error) {
  this.lastRunStatus = 'failed';
  this.lastRunAt = new Date();
  this.lastRunError = error;
  this.consecutiveFailures += 1;
  this.runCount += 1;
  
  if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
    this.isActive = false;
    this.lastRunError += ' (Auto-disabled due to consecutive failures)';
  }
  
  await this.save();
};

scheduledJobSchema.methods.getPublic = function() {
  return {
    id: this._id,
    workspaceId: this.workspaceId,
    name: this.name,
    description: this.description,
    cronExpression: this.cronExpression,
    timezone: this.timezone,
    action: {
      type: this.action.type
    },
    isActive: this.isActive,
    lastRunAt: this.lastRunAt,
    lastRunStatus: this.lastRunStatus,
    lastRunError: this.lastRunError,
    nextRunAt: this.nextRunAt,
    consecutiveFailures: this.consecutiveFailures,
    runCount: this.runCount,
    timeout: this.timeout,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('ScheduledJob', scheduledJobSchema);
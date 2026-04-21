const mongoose = require('mongoose');
const crypto = require('crypto');

const webhookEndpointSchema = new mongoose.Schema({
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
  url: {
    type: String,
    required: true
  },
  secret: {
    type: String,
    select: false
  },
  secretPrefix: {
    type: String,
    default: ''
  },
  events: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['healthy', 'failing', 'disabled'],
    default: 'healthy'
  },
  consecutiveFailures: {
    type: Number,
    default: 0
  },
  lastDeliveryAt: {
    type: Date,
    default: null
  },
  lastSuccessAt: {
    type: Date,
    default: null
  },
  stats: {
    totalDeliveries: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
    avgResponseTimeMs: { type: Number, default: 0 }
  },
  rateLimitPerMinute: {
    type: Number,
    default: 60
  },
  timeoutMs: {
    type: Number,
    default: 30000
  },
  headers: {
    type: Map,
    of: String,
    default: {}
  }
}, {
  timestamps: true
});

webhookEndpointSchema.index({ workspaceId: 1, isActive: 1 });
webhookEndpointSchema.index({ workspaceId: 1, status: 1 });

webhookEndpointSchema.methods.generateSecret = function() {
  const rawSecret = crypto.randomBytes(24).toString('hex');
  const hashedSecret = crypto.createHash('sha256').update(rawSecret).digest('hex');
  
  this.secret = hashedSecret;
  this.secretPrefix = rawSecret.substring(0, 6);
  
  return rawSecret;
};

webhookEndpointSchema.methods.verifySecret = function(rawSecret) {
  const hashedSecret = crypto.createHash('sha256').update(rawSecret).digest('hex');
  return hashedSecret === this.secret;
};

webhookEndpointSchema.methods.getPublic = function() {
  return {
    id: this._id,
    workspaceId: this.workspaceId,
    name: this.name,
    url: this.url,
    secretPrefix: this.secretPrefix,
    events: this.events,
    isActive: this.isActive,
    status: this.status,
    lastDeliveryAt: this.lastDeliveryAt,
    lastSuccessAt: this.lastSuccessAt,
    stats: this.stats,
    rateLimitPerMinute: this.rateLimitPerMinute,
    timeoutMs: this.timeoutMs,
    headers: Object.fromEntries(this.headers || new Map()),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

webhookEndpointSchema.methods.updateStats = async function(success, responseTimeMs) {
  this.stats.totalDeliveries += 1;
  
  if (success) {
    this.stats.successCount += 1;
    this.lastSuccessAt = new Date();
    this.consecutiveFailures = 0;
    this.status = 'healthy';
  } else {
    this.stats.failureCount += 1;
    this.consecutiveFailures += 1;
    
    if (this.consecutiveFailures >= 5) {
      this.status = 'failing';
    }
  }
  
  if (responseTimeMs) {
    const currentAvg = this.stats.avgResponseTimeMs;
    const newAvg = (currentAvg * (this.stats.totalDeliveries - 1) + responseTimeMs) / this.stats.totalDeliveries;
    this.stats.avgResponseTimeMs = Math.round(newAvg);
  }
  
  this.lastDeliveryAt = new Date();
  await this.save();
};

module.exports = mongoose.model('WebhookEndpoint', webhookEndpointSchema);
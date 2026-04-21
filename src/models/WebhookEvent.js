const mongoose = require('mongoose');

const webhookEventSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    index: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed
  },
  source: {
    type: String,
    enum: ['api', 'sdk', 'test', 'schedule'],
    default: 'api'
  },
  deliveryCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'delivered', 'failed', 'partial'],
    default: 'pending',
    index: true
  }
}, {
  timestamps: true
});

webhookEventSchema.index({ workspaceId: 1, createdAt: -1 });
webhookEventSchema.index({ workspaceId: 1, type: 1 });

webhookEventSchema.methods.markDelivered = function() {
  this.deliveryCount += 1;
  if (this.status !== 'partial') {
    this.status = 'delivered';
  }
};

webhookEventSchema.methods.markFailed = function() {
  this.deliveryCount += 1;
  if (this.deliveryCount > 0 && this.status === 'delivered') {
    this.status = 'partial';
  } else if (this.status === 'pending') {
    this.status = 'failed';
  }
};

module.exports = mongoose.model('WebhookEvent', webhookEventSchema);
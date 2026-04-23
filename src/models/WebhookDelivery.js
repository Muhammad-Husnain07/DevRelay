const mongoose = require('mongoose');

const webhookDeliverySchema = new mongoose.Schema({
  endpointId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WebhookEndpoint',
    required: true,
    index: true
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WebhookEvent'
  },
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'retrying'],
    default: 'pending'
  },
  attempt: {
    type: Number,
    default: 1
  },
  requestBody: {
    type: mongoose.Schema.Types.Mixed
  },
  requestHeaders: {
    type: mongoose.Schema.Types.Mixed
  },
  responseStatus: {
    type: Number
  },
  responseBody: {
    type: String
  },
  responseTimeMs: {
    type: Number
  },
  error: {
    type: String
  },
  nextRetryAt: {
    type: Date
  }
}, {
  timestamps: true
});

webhookDeliverySchema.index({ endpointId: 1, createdAt: -1 });
webhookDeliverySchema.index({ workspaceId: 1, createdAt: -1 });
webhookDeliverySchema.index({ eventId: 1 });
webhookDeliverySchema.index({ status: 1, workspaceId: 1 });

module.exports = mongoose.model('WebhookDelivery', webhookDeliverySchema);
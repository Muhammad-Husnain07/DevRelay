const mongoose = require('mongoose');

const gatewayRouteSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  name: { type: String, required: true },
  path: { type: String, required: true },
  upstream: {
    url: { type: String, required: true },
    timeout: { type: Number, default: 30000 }
  },
  stripPath: { type: Boolean, default: false },
  methods: [{ type: String, enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'], default: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'] }],
  auth: {
    required: { type: Boolean, default: false },
    type: { type: String, enum: ['jwt', 'api-key', 'none'], default: 'none' }
  },
  rateLimit: {
    enabled: { type: Boolean, default: false },
    requestsPerMinute: { type: Number, default: 60 },
    burstSize: { type: Number, default: 10 }
  },
  plugins: [{
    name: { type: String, required: true },
    config: { type: mongoose.Schema.Types.Mixed, default: {} }
  }],
  isActive: { type: Boolean, default: true },
  priority: { type: Number, default: 100, min: 0 }
}, { timestamps: true });

gatewayRouteSchema.index({ workspaceId: 1, path: 1 }, { unique: true });
gatewayRouteSchema.index({ workspaceId: 1, priority: 1, isActive: 1 });

module.exports = mongoose.model('GatewayRoute', gatewayRouteSchema);
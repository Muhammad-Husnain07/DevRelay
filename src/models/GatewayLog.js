const mongoose = require('mongoose');

const gatewayLogSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'GatewayRoute', required: true },
  requestId: { type: String, required: true },
  method: { type: String, enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'], required: true },
  path: { type: String, required: true },
  upstreamUrl: { type: String, required: true },
  consumerId: { type: String, default: 'anonymous' },
  statusCode: { type: Number, default: 0 },
  requestSizeBytes: { type: Number, default: 0 },
  responseSizeBytes: { type: Number, default: 0 },
  durationMs: { type: Number, default: 0 },
  error: { type: String, default: null }
}, { timestamps: true });

gatewayLogSchema.index({ workspaceId: 1, createdAt: -1 });
gatewayLogSchema.index({ routeId: 1, createdAt: -1 });
gatewayLogSchema.index({ requestId: 1 });

gatewayLogSchema.statics.computeStats = async function(workspaceId, routeId = null, since = new Date(Date.now() - 3600000)) {
  const match = { workspaceId, createdAt: { $gte: since } };
  if (routeId) match.routeId = routeId;

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        errorCount: { $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] } },
        avgLatency: { $avg: '$durationMs' },
        minLatency: { $min: '$durationMs' },
        maxLatency: { $max: '$durationMs' },
        latencies: { $push: '$durationMs' }
      }
    }
  ]);

  if (!stats.length) return { totalRequests: 0, errorRate: 0, avgLatency: 0, minLatency: 0, maxLatency: 0, p50: 0, p95: 0, p99: 0 };

  const s = stats[0];
  const sorted = s.latencies.sort((a, b) => a - b);
  const percentile = (arr, p) => arr[Math.floor(arr.length * p / 100)] || 0;

  return {
    totalRequests: s.totalRequests,
    errorCount: s.errorCount,
    errorRate: s.totalRequests > 0 ? (s.errorCount / s.totalRequests * 100).toFixed(2) : 0,
    avgLatency: Math.round(s.avgLatency),
    minLatency: s.minLatency,
    maxLatency: s.maxLatency,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99)
  };
};

module.exports = mongoose.model('GatewayLog', gatewayLogSchema);
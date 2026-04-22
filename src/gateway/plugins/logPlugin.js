const GatewayLog = require('../models/GatewayLog');
const { v4: uuidv4 } = require('uuid');

exports.requestIdPlugin = (req, res) => {
  req.requestId = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-Id', req.requestId);
};

exports.logPlugin = async (req, res, route, data = {}) => {
  setImmediate(async () => {
    try {
      await GatewayLog.create({
        workspaceId: route.workspaceId,
        routeId: route._id,
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        upstreamUrl: data.upstreamUrl || route.upstream.url,
        consumerId: req.consumerId || 'unknown',
        statusCode: res.statusCode || 200,
        requestSizeBytes: req.headers['content-length'] || 0,
        responseSizeBytes: parseInt(res.getHeader('content-length') || '0'),
        durationMs: data.durationMs || 0,
        error: data.error || null
      });
    } catch (err) {
      console.error('[Gateway] Log error:', err.message);
    }
  });
};
const axios = require('axios');
const GatewayRoute = require('../models/GatewayRoute');
const { authPlugin } = require('./plugins/authPlugin');
const { requestIdPlugin, logPlugin } = require('./plugins/logPlugin');
const { checkRateLimit, getRateLimitHeaders } = require('../services/rateLimitService');

const matchRoute = (path, routes) => {
  const sorted = [...routes].sort((a, b) => a.priority - b.priority);
  for (const route of sorted) {
    const pattern = route.path.endsWith('/') ? route.path : route.path + '/';
    if (path.startsWith(pattern) || path === route.path) {
      return route;
    }
  }
  return null;
};

const proxyRequest = async (req, res, route, requestId, consumerId) => {
  let upstreamPath = req.originalUrl.replace(/^\/gw\/[^\/]+/, '');
  if (route.stripPath) {
    upstreamPath = upstreamPath.replace(new RegExp(`^${route.path}`), '') || '/';
  }

  const upstreamUrl = `${route.upstream.url.replace(/\/$/, '')}${upstreamPath}`;

  const headers = { ...req.headers };
  delete headers['host'];
  delete headers['connection'];
  delete headers['x-consumer-id'];

  const startTime = Date.now();

  try {
    const response = await axios({
      method: req.method.toLowerCase(),
      url: upstreamUrl,
      headers,
      params: req.query,
      data: req.body,
      timeout: route.upstream.timeout || 30000,
      responseType: 'stream',
      validateStatus: () => true
    });

    const durationMs = Date.now() - startTime;

    Object.entries(response.headers).forEach(([key, value]) => {
      if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key)) {
        res.setHeader(key, value);
      }
    });

    res.status(response.status);
    res.setHeader('X-Request-Id', requestId);
    res.setHeader('X-Forwarded-For', req.ip);
    res.setHeader('X-DevRelay-Route', route.name);

    response.data.pipe(res);

    await logPlugin(req, res, route, { upstreamUrl, durationMs, consumerId });

  } catch (error) {
    const durationMs = Date.now() - startTime;
    await logPlugin(req, res, route, { upstreamUrl, durationMs, error: error.message, consumerId });
    res.status(502).json({ error: 'Upstream error', message: error.message });
  }
};

module.exports = async (req, res) => {
  const slug = req.params.workspaceSlug;
  const requestPath = req.originalUrl;

  const routes = await GatewayRoute.find({ isActive: true }).populate('workspaceId', 'slug');

  const route = matchRoute(
    requestPath.replace(/^\/gw\/[^\/]+\//, ''),
    routes.filter(r => r.workspaceId?.slug === slug)
  );

  if (!route) {
    return res.status(404).json({ error: 'No route found' });
  }

  const authResult = await authPlugin(req, res, route);
  if (!authResult.allowed) {
    return res.status(401).json({ error: authResult.error });
  }

  requestIdPlugin(req, res);

  const consumerId = req.headers['x-consumer-id'] || req.consumerId || 'anonymous';
  const rateResult = await checkRateLimit(consumerId, route._id, route.workspaceId);

  Object.entries(getRateLimitHeaders(rateResult)).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (!rateResult.allowed) {
    if (rateResult.limitType === 'quota') {
      return res.status(403).json({ error: 'Monthly quota exceeded', resetAt: rateResult.resetAt });
    }
    return res.status(429).json({ error: 'Rate limit exceeded', retryAfter: rateResult.retryAfter });
  }

  await proxyRequest(req, res, route, req.requestId, consumerId);
};
const { tokenBucket } = require('../utils/tokenBucket');
const Consumer = require('../models/Consumer');
const GatewayRoute = require('../models/GatewayRoute');
const { redisClient } = require('../config/redis');

const checkRateLimit = async (consumerId, routeId, workspaceId) => {
  const route = await GatewayRoute.findById(routeId);
  const consumer = await Consumer.findOne({ key: consumerId, workspaceId, isActive: true });

  let result = { allowed: true, limitType: 'none', limit: 0, remaining: 0, resetAt: Date.now() + 86400000 };

  if (route?.rateLimit.enabled) {
    const key = `ratelimit:${workspaceId}:${routeId}:${consumerId}`;
    const rb = await tokenBucket(key, route.rateLimit.burstSize, route.rateLimit.requestsPerMinute / 60, 1);
    if (!rb.allowed) {
      return { ...result, allowed: false, limitType: 'route-burst', limit: route.rateLimit.burstSize, remaining: rb.tokensRemaining, resetAt: Date.now() + rb.retryAfter };
    }
  }

  if (consumer) {
    if (consumer.quotas.monthlyRequests > 0 && consumer.quotas.currentMonthCount >= consumer.quotas.monthlyRequests) {
      return { ...result, allowed: false, limitType: 'quota', limit: consumer.quotas.monthlyRequests, remaining: 0, resetAt: consumer.quotas.quotaResetAt.getTime() };
    }

    const rpsKey = `rps:${workspaceId}:${consumerId}`;
    const rpmKey = `rpm:${workspaceId}:${consumerId}`;
    const rpdKey = `rpd:${workspaceId}:${consumerId}`;

    const [rbRps, rbRpm] = await Promise.all([
      tokenBucket(rpsKey, consumer.rateLimits.requestsPerSecond, consumer.rateLimits.requestsPerSecond, 1),
      tokenBucket(rpmKey, consumer.rateLimits.requestsPerMinute, consumer.rateLimits.requestsPerMinute / 60, 1)
    ]);

    if (!rbRps.allowed) return { ...result, allowed: false, limitType: 'rps', limit: consumer.rateLimits.requestsPerSecond, remaining: rbRps.tokensRemaining, resetAt: Date.now() + rbRps.retryAfter };
    if (!rbRpm.allowed) return { ...result, allowed: false, limitType: 'rpm', limit: consumer.rateLimits.requestsPerMinute, remaining: rbRpm.tokensRemaining, resetAt: Date.now() + rbRpm.retryAfter };
  }

  await incrementUsage(consumerId, workspaceId);

  return result;
};

const incrementUsage = async (consumerId, workspaceId) => {
  const workspaceIdStr = workspaceId.toString();
  const key = `quota:${workspaceIdStr}:${consumerId}`;
  const count = await redisClient.incr(key);
  await redisClient.expire(key, 2592000);

  // Always increment DB counter
  try {
    const consumer = await Consumer.findOne({ key: consumerId });
    if (consumer) {
      consumer.quotas.currentMonthCount = (consumer.quotas.currentMonthCount || 0) + 1;
      await consumer.save();
    }
  } catch (err) {
    console.error('[RateLimit] Quota sync error:', err.message);
  }
};

const getRateLimitHeaders = (result) => ({
  'X-RateLimit-Limit': result.limit,
  'X-RateLimit-Remaining': result.remaining,
  'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000),
  'Retry-After': result.allowed ? 0 : Math.ceil((result.resetAt - Date.now()) / 1000)
});

module.exports = { checkRateLimit, getRateLimitHeaders };
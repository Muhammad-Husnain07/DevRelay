const { redisClient } = require('../config/redis');

const SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

local count = redis.call('ZCARD', key)

if count < limit then
  redis.call('ZADD', key, now, now .. '-' .. math.random(1000000))
  redis.call('EXPIRE', key, window)
end

return count
`;

let scriptLoaded = null;

async function getScript() {
  if (!scriptLoaded) {
    scriptLoaded = await redisClient.script('LOAD', SLIDING_WINDOW_SCRIPT);
  }
  return scriptLoaded;
}

async function slidingWindowRateLimit(key, windowMs, limit) {
  try {
    const scriptSha = await getScript();
    const now = Date.now();
    
    const result = await redisClient.evalsha(
      scriptSha,
      1,
      key,
      now,
      windowMs,
      limit
    );

    const remaining = Math.max(0, limit - result);
    const isLimited = result >= limit;

    return {
      limited: isLimited,
      remaining,
      reset: now + windowMs
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    return { limited: false, remaining: limit, reset: Date.now() + windowMs };
  }
}

async function checkApiKeyRateLimit(apiKeyPrefix, workspacePlan = 'free') {
  const limits = {
    free: { requests: 100, window: 60000 },
    pro: { requests: 1000, window: 60000 }
  };

  const { requests, window } = limits[workspacePlan] || limits.free;
  const key = `ratelimit:apikey:${apiKeyPrefix}`;

  return slidingWindowRateLimit(key, window, requests);
}

async function checkIpRateLimit(ip, workspacePlan = 'free') {
  const limits = {
    free: { requests: 200, window: 60000 },
    pro: { requests: 1000, window: 60000 }
  };

  const { requests, window } = limits[workspacePlan] || limits.free;
  const key = `ratelimit:ip:${ip}`;

  return slidingWindowRateLimit(key, window, requests);
}

module.exports = {
  slidingWindowRateLimit,
  checkApiKeyRateLimit,
  checkIpRateLimit
};
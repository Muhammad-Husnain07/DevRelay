const { redisClient } = require('../../config/redis');
const { v4: uuidv4 } = require('uuid');

exports.rateLimitPlugin = async (req, res, route) => {
  if (!route.rateLimit.enabled) return { allowed: true };

  const key = `ratelimit:${route.workspaceId}:${route._id}:${req.consumerId || req.ip}`;
  const now = Date.now();
  const windowMs = 60000;
  const limit = route.rateLimit.requestsPerMinute;
  const burst = route.rateLimit.burstSize;

  const lua = `
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local window = tonumber(ARGV[2])
    local limit = tonumber(ARGV[3])
    local burst = tonumber(ARGV[4])
    
    redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
    local count = redis.call('ZCARD', key)
    
    if count >= limit then
      return {0, limit - count, limit}
    end
    
    if count >= burst then
      local oldest = tonumber(redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')[2])
      if oldest and (now - oldest) < (window / burst * 1000) then
        return {0, limit - count, limit}
      end
    end
    
    redis.call('ZADD', key, now, now)
    redis.call('EXPIRE', key, math.ceil(window / 1000))
    return {1, limit - count - 1, limit}
  `;

  const [allowed, remaining, limit] = await redisClient.eval(lua, {
    keys: [key],
    arguments: [now, windowMs, limit, burst]
  });

  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));

  if (!allowed) {
    res.status(429).json({ error: 'Rate limit exceeded' });
    return { allowed: false, error: 'Rate limit exceeded' };
  }

  return { allowed: true };
};
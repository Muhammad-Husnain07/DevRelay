const { redisClient } = require('../config/redis');

const tokenBucket = async (key, capacity, refillRate, tokensRequested = 1) => {
  const now = Date.now();
  const windowMs = 1000;

  const lua = `
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local capacity = tonumber(ARGV[2])
    local refillRate = tonumber(ARGV[3])
    local tokensRequested = tonumber(ARGV[4])
    local window = tonumber(ARGV[5])

    local bucket = redis.call('HMGET', key, 'tokens', 'lastUpdate')
    local tokens = tonumber(bucket[1])
    local lastUpdate = tonumber(bucket[2])

    if not tokens then
      tokens = capacity
      lastUpdate = now
    end

    local elapsed = (now - lastUpdate) / 1000
    local refill = elapsed * refillRate
    tokens = math.min(capacity, tokens + refill)

    local allowed = 0
    local retryAfter = 0

    if tokens >= tokensRequested then
      tokens = tokens - tokensRequested
      allowed = 1
    else
      retryAfter = math.ceil((tokensRequested - tokens) / refillRate * 1000)
    end

    redis.call('HMSET', key, 'tokens', tokens, 'lastUpdate', now)
    redis.call('EXPIRE', key, math.ceil(window / 1000))

    return { allowed, math.floor(tokens), retryAfter }
  `;

  const result = await redisClient.eval(lua, 1, key, now, capacity, refillRate, tokensRequested, windowMs);
  const [allowed, tokensRemaining, retryAfter] = result;

  return {
    allowed: allowed === 1,
    tokensRemaining,
    retryAfter,
    capacity,
    refillRate
  };
};

module.exports = { tokenBucket };
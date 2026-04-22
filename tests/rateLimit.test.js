const { tokenBucket } = require('../src/utils/tokenBucket');
const { redisClient } = require('../src/config/redis');

describe('Token Bucket Rate Limiting', () => {
  beforeEach(async () => {
    const keys = await redisClient.keys('test:ratelimit:*');
    if (keys.length) await redisClient.del(...keys);
  });

  afterAll(async () => {
    const keys = await redisClient.keys('test:ratelimit:*');
    if (keys.length) await redisClient.del(...keys);
  });

  test('token bucket allows burst up to capacity', async () => {
    const key = 'test:ratelimit:burst';
    const capacity = 5;
    const refillRate = 1;

    for (let i = 0; i < capacity; i++) {
      const result = await tokenBucket(key, capacity, refillRate, 1);
      expect(result.allowed).toBe(true);
      expect(result.tokensRemaining).toBe(capacity - i - 1);
    }
  });

  test('token bucket blocks when empty', async () => {
    const key = 'test:ratelimit:empty';
    const capacity = 2;
    const refillRate = 1;

    await tokenBucket(key, capacity, refillRate, 2);
    const result = await tokenBucket(key, capacity, refillRate, 1);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  test('multiple consumers dont interfere', async () => {
    const result1 = await tokenBucket('test:ratelimit:consumer1', 3, 1, 3);
    const result2 = await tokenBucket('test:ratelimit:consumer2', 3, 1, 3);

    expect(result1.allowed).toBe(true);
    expect(result2.allowed).toBe(true);
    expect(result1.tokensRemaining).toBe(0);
    expect(result2.tokensRemaining).toBe(0);
  });
});
const { checkCooldown, evaluateRule } = require('../src/services/alertEngine');
const AlertRule = require('../src/models/AlertRule');
const { redisClient } = require('../src/config/redis');

describe('alertEngine', () => {
  beforeEach(async () => {
    const keys = await redisClient.keys('alert:cooldown:*');
    if (keys.length) await redisClient.del(...keys);
  });

  describe('checkCooldown', () => {
    test('returns false when not in cooldown', async () => {
      const result = await checkCooldown('test-rule-id');
      expect(result).toBe(false);
    });

    test('returns true when in cooldown', async () => {
      await redisClient.setex('alert:cooldown:test-rule-id', 3600, '1');
      const result = await checkCooldown('test-rule-id');
      expect(result).toBe(true);
    });
  });

  describe('evaluateRule', () => {
    test('returns null for unknown metric', async () => {
      const rule = await AlertRule.create({
        workspaceId: '507f1f77bcf86cd799439011',
        name: 'Test',
        condition: { metric: 'unknown_metric', operator: 'gt', threshold: 10 },
        isActive: true
      });
      const result = await evaluateRule(rule);
      expect(result).toBeNull();
    });
  });
});
const { redisClient } = require('../config/redis');

const get = async (key) => {
  const value = await redisClient.get(key);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const set = async (key, value, ttlSeconds = 300) => {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  await redisClient.set(key, serialized, 'EX', ttlSeconds);
};

const del = async (key) => {
  await redisClient.del(key);
};

const invalidatePattern = async (pattern) => {
  const keys = await redisClient.keys(pattern);
  if (keys.length > 0) {
    await redisClient.del(...keys);
  }
  return keys.length;
};

const withCache = async (key, ttlSeconds, fn) => {
  const cached = await get(key);
  if (cached) return cached;

  const result = await fn();
  await set(key, result, ttlSeconds);
  return result;
};

const getJson = async (key) => get(key);
const setJson = async (key, value, ttl) => set(key, value, ttl);

module.exports = { get: getJson, set: setJson, del, invalidatePattern, withCache };
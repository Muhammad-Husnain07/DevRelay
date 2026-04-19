const Redis = require('ioredis');
const env = require('./env');

const redisClient = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
  reconnectOnError(err) {
    console.error('[Redis] Reconnect on error:', err.message);
    return true;
  }
});

redisClient.on('connect', () => {
  console.log('[Redis] Connected to', env.redisUrl);
});

redisClient.on('ready', () => {
  console.log('[Redis] Ready');
});

redisClient.on('error', (err) => {
  console.error('[Redis] Error:', err.message);
});

redisClient.on('close', () => {
  console.warn('[Redis] Connection closed');
});

async function disconnectRedis() {
  await redisClient.quit();
  console.log('[Redis] Disconnected');
}

module.exports = {
  redisClient,
  disconnect: disconnectRedis
};
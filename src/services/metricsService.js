const { redisClient } = require('../config/redis');
const { getQueues } = require('../config/queues');
const Metric = require('../models/Metric');

const incrementCounter = async (workspaceId, metric, value = 1) => {
  const key = `metrics:${workspaceId}:${metric}`;
  const count = await redisClient.incrby(key, value);
  await redisClient.expire(key, 86400);
  return count;
};

const getQueueDepth = async (queueName) => {
  try {
    const queue = getQueues()[queueName];
    if (!queue) return { waiting: 0, active: 0, completed: 0, failed: 0 };
    const counts = await Promise.race([
      queue.getJobCounts(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
    ]);
    return counts;
  } catch (error) {
    console.error('Queue depth error:', error.message);
    return { waiting: 0, active: 0, completed: 0, failed: 0 };
  }
};

const getLiveStats = async (workspaceId) => {
  const queues = ['webhook', 'job', 'email', 'scheduler'];
  const queueDepths = {};

  for (const name of queues) {
    queueDepths[name] = await getQueueDepth(name);
  }

  const deliveryCount = await redisClient.get(`metrics:${workspaceId}:deliveries`);
  const jobCount = await redisClient.get(`metrics:${workspaceId}:jobs`);
  const emailCount = await redisClient.get(`metrics:${workspaceId}:emails`);

  return {
    queueDepths,
    deliveriesTotal: parseInt(deliveryCount || '0'),
    jobsTotal: parseInt(jobCount || '0'),
    emailsTotal: parseInt(emailCount || '0'),
    timestamp: Date.now()
  };
};

const addToTimeSeries = async (workspaceId, metric, value = 1, timestamp = Date.now()) => {
  const key = `timeseries:${workspaceId}:${metric}`;
  await redisClient.zadd(key, timestamp, `${timestamp}:${Math.random()}`);
  await redisClient.expire(key, 86400 * 3);
};

const getTimeSeries = async (workspaceId, metric, hours = 24) => {
  const key = `timeseries:${workspaceId}:${metric}`;
  const start = Date.now() - hours * 3600000;

  const raw = await redisClient.zrangebyscore(key, start, '+inf', 'LIMIT', 0, 1000);
  const buckets = {};

  for (const entry of raw) {
    const ts = parseInt(entry.split(':')[0]);
    const bucket = Math.floor(ts / (300000)) * 300000;
    buckets[bucket] = (buckets[bucket] || 0) + 1;
  }

  return Object.entries(buckets).map(([timestamp, count]) => ({ timestamp: parseInt(timestamp), count })).sort((a, b) => a.timestamp - b.timestamp);
};

const getSummary = async (workspaceId) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [daily, weekly, monthly] = await Promise.all([
    Metric.findOne({ workspaceId, date: { $gte: startOfDay } }),
    Metric.findOne({ workspaceId, date: { $gte: startOfWeek } }),
    Metric.findOne({ workspaceId, date: { $gte: startOfMonth } })
  ]);

  return {
    today: daily || { deliveriesTotal: 0, jobsTotal: 0, emailsSent: 0 },
    thisWeek: weekly || { deliveriesTotal: 0, jobsTotal: 0, emailsSent: 0 },
    thisMonth: monthly || { deliveriesTotal: 0, jobsTotal: 0, emailsSent: 0 }
  };
};

module.exports = { incrementCounter, getQueueDepth, getLiveStats, addToTimeSeries, getTimeSeries, getSummary };
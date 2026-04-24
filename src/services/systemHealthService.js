const mongoose = require('mongoose');
const { redisClient } = require('../config/redis');
const { getQueues } = require('../config/queues');
const fs = require('fs');
const path = require('path');

const pingMongoDB = async () => {
  const start = Date.now();
  try {
    await mongoose.connection.db.admin().ping();
    return { latency: Date.now() - start, status: 'connected' };
  } catch (err) {
    return { latency: -1, status: 'error', error: err.message };
  }
};

const pingRedis = async () => {
  const start = Date.now();
  try {
    const result = await redisClient.ping();
    return { latency: Date.now() - start, status: result === 'PONG' ? 'connected' : 'error' };
  } catch (err) {
    return { latency: -1, status: 'error', error: err.message };
  }
};

const getQueueStatus = async () => {
  const queues = getQueues();
  const status = {};

  for (const [name, queue] of Object.entries(queues)) {
    try {
      const counts = await queue.getJobCounts();
      const paused = await queue.isPaused();
      status[name] = {
        waiting: counts.waiting,
        active: counts.active,
        completed: counts.completed,
        failed: counts.failed,
        delayed: counts.delayed,
        paused
      };
    } catch (err) {
      status[name] = { error: err.message };
    }
  }

  return status;
};

const getDiskUsage = () => {
  try {
    const logsDir = path.join(__dirname, '../../logs');
    if (!fs.existsSync(logsDir)) {
      return { logsDir: 0, unit: 'MB' };
    }

    let totalSize = 0;
    const files = fs.readdirSync(logsDir);

    for (const file of files) {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
    }

    return {
      logsDir: (totalSize / (1024 * 1024)).toFixed(2),
      unit: 'MB'
    };
  } catch (err) {
    return { logsDir: 0, unit: 'MB', error: err.message };
  }
};

const getMemoryUsage = () => {
  const mem = process.memoryUsage();
  return {
    heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
    rss: Math.round(mem.rss / 1024 / 1024),
    external: Math.round(mem.external / 1024 / 1024),
    unit: 'MB'
  };
};

const getSystemHealth = async () => {
  const [mongo, redis, queues, disk, memory] = await Promise.all([
    pingMongoDB(),
    pingRedis(),
    getQueueStatus(),
    Promise.resolve(getDiskUsage()),
    Promise.resolve(getMemoryUsage())
  ]);

  const uptime = process.uptime();

  return {
    status: mongo.status === 'connected' && redis.status === 'connected' ? 'healthy' : 'degraded',
    uptime,
    mongodb: mongo,
    redis,
    queues,
    disk,
    memory,
    timestamp: new Date().toISOString()
  };
};

const getSystemStats = async () => {
  const Workspace = require('../models/Workspace');
  const User = require('../models/User');
  const Job = require('../models/Job');
  const WebhookDelivery = require('../models/WebhookDelivery');

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    totalWorkspaces,
    activeWorkspaces,
    totalUsers,
    jobsLast24h,
    deliveriesLast24h,
    emailsLast24h,
    failedDeliveries,
    failedJobs
  ] = await Promise.all([
    Workspace.countDocuments(),
    Workspace.countDocuments({ isActive: true }),
    User.countDocuments(),
    Job.countDocuments({ createdAt: { $gte: oneDayAgo } }),
    WebhookDelivery.countDocuments({ createdAt: { $gte: oneDayAgo } }),
    Job.countDocuments({ createdAt: { $gte: oneDayAgo }, name: { $regex: /email/i } }),
    WebhookDelivery.countDocuments({ status: 'failed', createdAt: { $gte: oneDayAgo } }),
    Job.countDocuments({ status: 'failed', createdAt: { $gte: oneDayAgo } })
  ]);

  const totalDeliveries = deliveriesLast24h || 1;
  const totalJobs = jobsLast24h || 1;

  return {
    totalWorkspaces,
    activeWorkspaces,
    totalUsers,
    jobsLast24h,
    deliveriesLast24h,
    emailsLast24h,
    failureRates: {
      deliveries: ((failedDeliveries / totalDeliveries) * 100).toFixed(2),
      jobs: ((failedJobs / totalJobs) * 100).toFixed(2)
    },
    timestamp: new Date().toISOString()
  };
};

module.exports = { getSystemHealth, getSystemStats, getQueueStatus };
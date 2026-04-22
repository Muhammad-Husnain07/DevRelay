const cron = require('node-cron');
const Metric = require('../models/Metric');
const { redisClient } = require('../config/redis');
const { getLiveStats } = require('../services/metricsService');

let aggregatorJob = null;

const aggregate = async () => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const metricKeys = await redisClient.keys('metrics:*:deliveries');
    const workspaces = [...new Set(metricKeys.map(k => k.split(':')[1]))];

    for (const workspaceId of workspaces) {
      const stats = await getLiveStats(workspaceId);

      await Metric.findOneAndUpdate(
        { workspaceId, date: { $gte: startOfDay } },
        {
          workspaceId,
          date: startOfDay,
          $inc: {
            deliveriesTotal: stats.deliveriesTotal || 0,
            jobsTotal: stats.jobsTotal || 0,
            emailsSent: stats.emailsTotal || 0
          }
        },
        { upsert: true, new: true }
      );
    }

    console.log(`[MetricsAggregator] Aggregated ${workspaces.length} workspaces`);
  } catch (err) {
    console.error('[MetricsAggregator] Error:', err.message);
  }
};

const start = () => {
  aggregatorJob = cron.schedule('* * * * *', aggregate);
  console.log('[MetricsAggregator] Started');
};

const stop = () => {
  if (aggregatorJob) aggregatorJob.stop();
  console.log('[MetricsAggregator] Stopped');
};

module.exports = { start, stop, aggregate };
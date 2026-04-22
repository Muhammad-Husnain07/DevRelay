const cron = require('node-cron');
const Consumer = require('../models/Consumer');
const { redisClient } = require('../config/redis');

let monthlyJob = null;
let syncJob = null;

const resetMonthlyQuotas = async () => {
  try {
    const now = new Date();
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    await Consumer.updateMany({}, {
      $set: {
        'quotas.currentMonthCount': 0,
        'quotas.quotaResetAt': nextReset
      }
    });

    console.log(`[QuotaWorker] Reset ${0} consumer quotas at ${now.toISOString()}`);
  } catch (err) {
    console.error('[QuotaWorker] Monthly reset error:', err);
  }
};

const syncRedisToDb = async () => {
  try {
    const keys = await redisClient.keys('quota:*');
    if (!keys.length) return;

    let synced = 0;
    for (const key of keys) {
      const count = await redisClient.getdel(key);
      if (count) {
        const [, workspaceId, consumerId] = key.split(':');
        await Consumer.updateOne({ key: consumerId }, { $set: { 'quotas.currentMonthCount': parseInt(count) } });
        synced++;
      }
    }
    console.log(`[QuotaWorker] Synced ${synced} consumer quotas to DB`);
  } catch (err) {
    console.error('[QuotaWorker] Sync error:', err);
  }
};

const start = () => {
  monthlyJob = cron.schedule('0 0 1 * *', resetMonthlyQuotas);
  syncJob = cron.schedule('0 * * * *', syncRedisToDb);
  console.log('[QuotaWorker] Started');
};

const stop = () => {
  if (monthlyJob) monthlyJob.stop();
  if (syncJob) syncJob.stop();
  console.log('[QuotaWorker] Stopped');
};

module.exports = { start, stop, resetMonthlyQuotas, syncRedisToDb };
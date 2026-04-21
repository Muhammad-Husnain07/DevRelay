const { Queue } = require('bullmq');
const { redisClient } = require('./redis');

const connection = {
  connection: redisClient,
  maxRetriesPerRequest: null
};

const webhookDeliveryQueue = new Queue('webhook-delivery', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: {
      count: 100,
      age: 24 * 3600
    },
    removeOnFail: {
      count: 500,
      age: 7 * 24 * 3600
    }
  }
});

const emailQueue = new Queue('email', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: {
      count: 50,
      age: 24 * 3600
    },
    removeOnFail: {
      count: 100,
      age: 7 * 24 * 3600
    }
  }
});

const schedulerQueue = new Queue('scheduler', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    removeOnComplete: {
      count: 100,
      age: 24 * 3600
    },
    removeOnFail: {
      count: 100,
      age: 7 * 24 * 3600
    }
  }
});

async function getQueueStats(queueName) {
  const queue = queueName === 'webhook-delivery' ? webhookDeliveryQueue 
    : queueName === 'email' ? emailQueue
    : queueName === 'scheduler' ? schedulerQueue
    : null;
    
  if (!queue) return null;
  
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount()
  ]);
  
  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + delayed
  };
}

module.exports = {
  webhookDeliveryQueue,
  emailQueue,
  schedulerQueue,
  getQueueStats
};
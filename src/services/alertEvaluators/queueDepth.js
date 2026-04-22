const { getQueueDepth } = require('../../services/metricsService');

const evaluate = async (queueName = 'webhook') => {
  const counts = await getQueueDepth(queueName);
  return counts.waiting || 0;
};

module.exports = { evaluate };
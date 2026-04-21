const { webhookDeliveryQueue, emailQueue, schedulerQueue } = require('./queues');

function setupBullBoard(app, authMiddleware) {
  console.log('[BullBoard] Bull Board UI - feature disabled temporarily');
}

module.exports = { setupBullBoard };
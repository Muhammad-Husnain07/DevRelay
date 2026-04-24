const { BullBoard } = require('@bull-board/api');
const { ExpressAdapter } = require('@bull-board/express');
const { getQueues } = require('./queues');

function setupBullBoard(app, authMiddleware) {
  const queues = getQueues();
  const queueAdapters = [
    queues.webhookDelivery,
    queues.email,
    queues.genericJob,
    queues.scheduler
  ].filter(Boolean);

  if (queueAdapters.length === 0) {
    console.log('[BullBoard] No queues available');
    return;
  }

  try {
    const BullMQAdapter = require('@bull-board/api').BullMQAdapter;
    const QUEUES = queueAdapters.map(q => new BullMQAdapter(q));

    if (QUEUES.length === 0) {
      console.log('[BullBoard] No adapters created');
      return;
    }

    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/bull-board');

    const bullBoard = new BullBoard({
      queueAdapter: QUEUES[0],
      serverAdapter,
      options: {
        ui: {
          staticVersion: '6.20.5'
        }
      }
    });

    bullBoard.setRouterEntry(app);
    console.log('[BullBoard] mounted at /admin/bull-board');
  } catch (err) {
    console.log('[BullBoard] skipped:', err.message);
  }
}

module.exports = { setupBullBoard };
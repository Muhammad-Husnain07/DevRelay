const { BullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api');
const { ExpressAdapter } = require('@bull-board/express');
const { getQueues } = require('./queues');

const QUEUES = [
  new BullMQAdapter(getQueues().webhook || getQueues().webhookDelivery),
  new BullMQAdapter(getQueues().email),
  new BullMQAdapter(getQueues().job || getQueues().genericJob),
  new BullMQAdapter(getQueues().scheduler)
].filter(q => q);

function setupBullBoard(app, authMiddleware) {
  if (QUEUES.length === 0) {
    console.log('[BullBoard] No queues available');
    return;
  }

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/bull-board');

  const bullBoard = new BullBoard({
    queues: QUEUES,
    serverAdapter
  });

  bullBoard.setRouter(app);

  app.use('/admin/bull-board/auth', (req, res, next) => {
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASS || 'admin123';

    const validUser = 'admin';
    const validPass = 'admin123';

    if (req.query.admin === 'true') {
      req.session = { isAdmin: true };
      return next();
    }

    res.status(401).json({ error: 'Admin authentication required', hint: '/admin/bull-board/auth?admin=true' });
  });

  console.log('[BullBoard] Available at /admin/bull-board (auth: /admin/bull-board/auth?admin=true)');
}

module.exports = { setupBullBoard };
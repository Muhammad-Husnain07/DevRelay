const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const passport = require('passport');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

const env = require('./config/env');
const authRoutes = require('./api/authRoutes');
const workspaceRoutes = require('./api/workspaceRoutes');
const webhookRoutes = require('./api/webhookRoutes');
const eventRoutes = require('./api/eventRoutes');
const receiverRoutes = require('./api/receiverRoutes');
const jobRoutes = require('./api/jobRoutes');
const schedulerRoutes = require('./api/schedulerRoutes');
const emailRoutes = require('./api/emailRoutes');
const gatewayRoutes = require('./api/gatewayRoutes');
const gatewayProxy = require('./api/gatewayProxy');
const consumerRoutes = require('./api/consumerRoutes');
const metricsRoutes = require('./api/metricsRoutes');
const alertRoutes = require('./api/alertRoutes');
const adminRoutes = require('./api/adminRoutes');
const { setupSwagger } = require('./config/swagger');
const { setupBullBoard } = require('./config/bullBoard');
const { globalLimiter, authLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { logger, stream, morganFormat } = require('./utils/logger');
const { authenticate } = require('./middleware/auth');
const { requestIdMiddleware } = require('./middleware/requestId');
const { ssrfProtection } = require('./middleware/ssrfProtection');

require('./config/passport')(passport);

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://unpkg.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://unpkg.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://unpkg.com'],
      fontSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://unpkg.com'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  referrerPolicy: { policy: 'same-origin' }
}));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(mongoSanitize());
app.use(hpp());

app.use(requestIdMiddleware);
app.use(ssrfProtection);

app.use(morgan(morganFormat, { stream }));

app.use(passport.initialize());

app.use(globalLimiter);
app.use('/api/auth', authLimiter);

app.get('/', (req, res) => {
  res.json({ message: 'DevRelay API', version: '1.0.0', docs: '/api/docs' });
});

app.get('/api/health', async (req, res) => {
  const { redisClient } = require('./config/redis');
  const mongoose = require('mongoose');
  const { getQueues } = require('./config/queues');

  const queues = getQueues();
  const queueStatus = {};

  try {
    for (const [name, queue] of Object.entries(queues)) {
      try {
        const counts = await Promise.race([
          queue.getJobCounts(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
        ]);
        queueStatus[name] = counts;
      } catch {
        queueStatus[name] = { error: 'unavailable' };
      }
    }
  } catch {
    queueStatus = { error: 'unable to fetch' };
  }

  const mem = process.memoryUsage();

  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(mem.rss / 1024 / 1024) + 'MB'
    },
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    redis: redisClient.status === 'ready' ? 'connected' : 'disconnected',
    queues: queueStatus,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/ping', (req, res) => {
  res.status(200).json({ message: 'pong' });
});

app.use('/receive', receiverRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/workspaces', webhookRoutes);
app.use('/api/workspaces', eventRoutes);
app.use('/api/workspaces', receiverRoutes);
app.use('/api/workspaces', jobRoutes);
app.use('/api/workspaces', schedulerRoutes);
app.use('/api/workspaces', emailRoutes);
app.use('/api/workspaces', gatewayRoutes);
app.use('/api/workspaces', consumerRoutes);
app.use('/api/workspaces', metricsRoutes);
app.use('/api/workspaces', alertRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/gw', gatewayProxy);

const bullBoardAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  authenticate(req, res, (err) => {
    if (err || !req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (req.user.plan !== 'pro') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
};

setupBullBoard(app, bullBoardAuthMiddleware);
setupSwagger(app);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
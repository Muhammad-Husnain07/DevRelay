const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const passport = require('passport');

const env = require('./config/env');
const authRoutes = require('./api/authRoutes');
const workspaceRoutes = require('./api/workspaceRoutes');
const webhookRoutes = require('./api/webhookRoutes');
const eventRoutes = require('./api/eventRoutes');
const receiverRoutes = require('./api/receiverRoutes');
const jobRoutes = require('./api/jobRoutes');
const schedulerRoutes = require('./api/schedulerRoutes');
const emailRoutes = require('./api/emailRoutes');
const { setupSwagger } = require('./config/swagger');
const { setupBullBoard } = require('./config/bullBoard');
const { globalLimiter, authLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { logger, stream, morganFormat } = require('./utils/logger');
const { authenticate } = require('./middleware/auth');

require('./config/passport')(passport);

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morgan(morganFormat, { stream }));

app.use(passport.initialize());

app.use(globalLimiter);
app.use('/api/auth', authLimiter);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
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
app.use('/api/scheduler', schedulerRoutes);

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

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
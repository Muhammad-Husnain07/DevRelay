const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const passport = require('passport');

const env = require('./config/env');
const authRoutes = require('./api/authRoutes');
const workspaceRoutes = require('./api/workspaceRoutes');
const { setupSwagger } = require('./config/swagger');
const { globalLimiter, authLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { logger, stream, morganFormat } = require('./utils/logger');

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

app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);

setupSwagger(app);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
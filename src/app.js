const app = require('./server');
const env = require('./config/env');
const database = require('./config/database');
const { redisClient } = require('./config/redis');
const { createTransport } = require('./services/emailService');
const { socketServer } = require('./socket/socketServer');
const cronManager = require('./scheduler/cronManager');
const { start: startQuotaWorker } = require('./workers/quotaResetWorker');
const { start: startMetricsAggregator } = require('./workers/metricsAggregator');
const { start: startWebhookDeliveryWorker } = require('./workers/webhookDeliveryWorker');
const { start: startGenericJobWorker } = require('./workers/genericJobWorker');
const { start: startEmailWorker } = require('./workers/emailWorker');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (env.isDevelopment) {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

async function start() {
  try {
    await database.connect();
    console.log('[Database] Connected');

    await redisClient.ping();
    console.log('[Redis] Connected');

    // Ensure Redis is fully ready before proceeding
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await createTransport();
    console.log('[Email] Service initialized');

    const server = app.listen(env.port, () => {
      console.log(`[Server] DevRelay running on port ${env.port}`);
      console.log(`[Server] Environment: ${env.nodeEnv}`);
      console.log(`[Server] Health check: http://localhost:${env.port}/api/health`);
    });

    socketServer(server);
    console.log('[Socket] Server initialized');

    cronManager.loadAll();
    console.log('[Cron] Manager loaded');

    // Add longer delays before starting workers to ensure Redis is fully ready
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    startQuotaWorker();
    startMetricsAggregator();
    startWebhookDeliveryWorker();
    startGenericJobWorker();
    startEmailWorker();

    const gracefulShutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await database.disconnect();
        await redisClient.quit();
        console.log('[Server] Shutdown complete');
        process.exit(0);
      });

      setTimeout(() => {
        console.error('[Server] Forcible shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { start };
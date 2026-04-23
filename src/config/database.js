const mongoose = require('mongoose');
const env = require('./env');

const MAX_RETRY_ATTEMPTS = 5;
const RETRY_INTERVAL_MS = 5000;

let retryCount = 0;

async function connectWithRetry() {
  try {
    await mongoose.connect(env.mongodbUri, {
      maxPoolSize: 20,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    retryCount = 0;
    console.log(`[MongoDB] Connected to ${env.mongodbUri}`);
  } catch (error) {
    retryCount++;
    if (retryCount >= MAX_RETRY_ATTEMPTS) {
      console.error(`[MongoDB] Failed after ${MAX_RETRY_ATTEMPTS} attempts. Exiting.`);
      process.exit(1);
    }
    console.log(`[MongoDB] Connection failed (attempt ${retryCount}/${MAX_RETRY_ATTEMPTS}). Retrying in ${RETRY_INTERVAL_MS}ms...`);
    await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL_MS));
    return connectWithRetry();
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Disconnected. Attempting to reconnect...');
  connectWithRetry();
});

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] Connection error:', err.message);
});

async function disconnectDatabase() {
  await mongoose.disconnect();
  console.log('[MongoDB] Disconnected');
}

module.exports = {
  connect: connectWithRetry,
  disconnect: disconnectDatabase,
  connection: mongoose.connection
};
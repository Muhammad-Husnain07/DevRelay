require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const GatewayLog = require('../src/models/GatewayLog');
const WebhookDelivery = require('../src/models/WebhookDelivery');
const Alert = require('../src/models/Alert');
const Metric = require('../src/models/Metric');

async function purgeOldLogs() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/devrelay');
  console.log('Connected to MongoDB');

  const days = parseInt(process.argv[2]) || 90;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  console.log(`Purging logs older than ${days} days (before ${cutoff.toISOString()})`);

  const [gatewayLogs, webhookDeliveries, alerts, metrics] = await Promise.all([
    GatewayLog.deleteMany({ createdAt: { $lt: cutoff } }),
    WebhookDelivery.deleteMany({ createdAt: { $lt: cutoff } }),
    Alert.deleteMany({ createdAt: { $lt: cutoff } }),
    Metric.deleteMany({ date: { $lt: cutoff } })
  ]);

  console.log(`Deleted:`);
  console.log(`  GatewayLog: ${gatewayLogs.deletedCount}`);
  console.log(`  WebhookDelivery: ${webhookDeliveries.deletedCount}`);
  console.log(`  Alert: ${alerts.deletedCount}`);
  console.log(`  Metric: ${metrics.deletedCount}`);

  await mongoose.disconnect();
  console.log('Done');
}

purgeOldLogs().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
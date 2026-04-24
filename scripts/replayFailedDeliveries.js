require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { getQueues } = require('../src/config/queues');
const WebhookEndpoint = require('../src/models/WebhookEndpoint');
const WebhookDelivery = require('../src/models/WebhookDelivery');
const WebhookEvent = require('../src/models/WebhookEvent');

async function replayFailedDeliveries() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/devrelay');
  console.log('Connected to MongoDB');

  const workspaceSlug = process.argv[2];
  const limit = parseInt(process.argv[3]) || 100;

  if (!workspaceSlug) {
    console.log('Usage: node replayFailedDeliveries.js <workspace-slug> [limit]');
    console.log('Retries all failed webhook deliveries for a workspace');
    await mongoose.disconnect();
    return;
  }

  const workspace = await mongoose.connection.db.collection('workspaces').findOne({ slug: workspaceSlug });
  if (!workspace) {
    console.error(`Workspace not found: ${workspaceSlug}`);
    await mongoose.disconnect();
    return;
  }

  console.log(`Replaying failed deliveries for workspace: ${workspace.name}`);

  const failedDeliveries = await WebhookDelivery.find({
    workspaceId: workspace._id,
    status: 'failed'
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('endpointId');

  console.log(`Found ${failedDeliveries.length} failed deliveries to replay`);

  const webhookQueue = getQueues().webhookDelivery;
  if (!webhookQueue) {
    console.error('Webhook delivery queue not found');
    await mongoose.disconnect();
    return;
  }

  let queued = 0;
  for (const delivery of failedDeliveries) {
    try {
      await webhookQueue.add('deliver-webhook', {
        deliveryId: delivery._id.toString(),
        endpointId: delivery.endpointId._id.toString(),
        eventId: delivery.eventId?.toString(),
        attempt: 1
      });

      queued++;
      if (queued % 10 === 0) {
        console.log(`Queued ${queued}/${failedDeliveries.length}...`);
      }
    } catch (err) {
      console.error(`Failed to queue delivery ${delivery._id}: ${err.message}`);
    }
  }

  console.log(`Successfully queued ${queued} failed deliveries for retry`);

  await mongoose.disconnect();
  console.log('Done');
}

replayFailedDeliveries().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
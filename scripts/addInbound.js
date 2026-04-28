const mongoose = require('mongoose');
require('../src/models/InboundWebhook');
require('../src/models/Workspace');

const InboundWebhook = mongoose.model('InboundWebhook');
const Workspace = mongoose.model('Workspace');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/devrelay').then(async () => {
  const ws = await Workspace.findOne({ slug: 'demo-workspace' });
  if (!ws) {
    console.log('Demo workspace not found');
    return;
  }

  const existing = await InboundWebhook.findOne({ slug: 'demo-workspace' });
  if (existing) {
    console.log('Inbound webhook exists:', existing.slug);
    return;
  }

  const inbound = await InboundWebhook.create({
    workspaceId: ws._id,
    name: 'Demo Inbound',
    slug: 'demo-workspace',
    secret: 'test_secret_12345',
    events: ['*'],
    isActive: true,
    transform: {},
    defaultEventType: 'webhook.received'
  });

  console.log('Created inbound webhook:', inbound.slug);
  await mongoose.disconnect();
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
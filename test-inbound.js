const InboundWebhook = require('./src/models/InboundWebhook');
const crypto = require('crypto');
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb://mongo:27017/devrelay';

async function testInbound() {
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
  
  const slug = 'test-inbound-' + Date.now();
  const rawSecret = crypto.randomBytes(32).toString('hex');
  const hashedSecret = crypto.createHash('sha256').update(rawSecret).digest('hex');
  
  const inbound = await InboundWebhook.create({
    name: 'Test Inbound',
    slug: slug,
    workspaceId: '69ed0c7e1c43772d60f05401',
    secret: hashedSecret,
    signatureHeader: 'x-test-signature',
    signatureAlgorithm: 'sha256',
    signatureFormat: 'hex',
    isActive: true
  });
  
  console.log('Created Inbound Webhook:');
  console.log('  Slug:', slug);
  console.log('  Secret:', rawSecret);
  console.log('  ID:', inbound._id);
  
  // Test the receive endpoint
  const payload = JSON.stringify({ event: 'test', data: { message: 'Hello World' } });
  const signature = 'sha256=' + crypto.createHmac('sha256', rawSecret).update(payload).digest('hex');
  
  console.log('\nTesting receive endpoint:');
  console.log('  URL: /receive/' + slug);
  console.log('  Payload:', payload);
  console.log('  Signature:', signature);
  
  await mongoose.disconnect();
  console.log('\nDone!');
}

testInbound().catch(e => console.error(e));
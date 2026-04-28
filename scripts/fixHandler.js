const { MongoClient } = require('mongodb');

async function main() {
  const client = new MongoClient('mongodb://mongo:27017/devrelay');
  await client.connect();
  
  const db = client.db();
  
  const result = await db.collection('jobdefinitions').updateOne(
    { name: 'send-email' },
    { $set: { handler: 'send-email' } }
  );
  console.log('Updated:', result.modifiedCount);
  
  const job = await db.collection('jobdefinitions').findOne({ name: 'send-email' });
  console.log('Handler:', job.handler);
  
  await client.close();
}

main().catch(console.error);
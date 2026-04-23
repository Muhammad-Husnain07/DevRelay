const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  console.log('[Test] MongoDB connected');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  console.log('[Test] MongoDB stopped');
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const name in collections) {
    await collections[name].deleteMany({});
  }
});

process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
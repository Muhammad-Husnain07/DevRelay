const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

require('../src/models/User');
require('../src/models/Workspace');

const User = mongoose.model('User');
const Workspace = mongoose.model('Workspace');

async function addDemoUser() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/devrelay');
  
  const demoPassword = await bcrypt.hash('demo123', 10);
  
  let demo = await User.findOne({ email: 'demo@devrelay.io' });
  if (!demo) {
    demo = await User.create({
      name: 'Demo User',
      email: 'demo@devrelay.io',
      password: demoPassword,
      isActive: true,
      github: { id: 'demo123', username: 'demo' }
    });
    console.log('Created demo user');
  } else {
    console.log('Demo user already exists');
  }
  
  let ws = await Workspace.findOne({ slug: 'demo-workspace' });
  if (!ws) {
    ws = await Workspace.create({
      name: 'DevRelay Demo',
      slug: 'demo-workspace',
      ownerId: demo._id,
      members: [
        { userId: demo._id, role: 'owner' }
      ],
      isActive: true
    });
    console.log('Created demo workspace');
  } else {
    console.log('Demo workspace already exists');
  }
  
  await mongoose.disconnect();
  console.log('Done');
}

addDemoUser().catch(console.error);
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('../src/models/User');

const User = mongoose.model('User');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/devrelay').then(async () => {
  const user = await User.findOne({ email: 'demo@devrelay.io' });
  
  // Generate a fresh hash and save it directly using the model's pre-save hook behavior
  user.password = 'demo123';
  await user.save();
  
  console.log('Saved with model');
  
  const freshUser = await User.findOne({ email: 'demo@devrelay.io' }).select('+password');
  console.log('New hash:', freshUser.password);
  
  const match = await bcrypt.compare('demo123', freshUser.password);
  console.log('Match:', match);
  
  await mongoose.disconnect();
  process.exit(0);
});
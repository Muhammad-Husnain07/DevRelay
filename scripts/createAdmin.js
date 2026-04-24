require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function createAdmin() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/devrelay');
  console.log('Connected to MongoDB');

  const email = process.argv[2];

  if (!email) {
    console.log('Usage: node createAdmin.js <email>');
    console.log('Creates an admin user or upgrades existing user to admin role');
    await mongoose.disconnect();
    return;
  }

  let user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    const bcrypt = require('bcryptjs');
    const password = Math.random().toString(36).slice(-8);

    user = await User.create({
      name: 'Admin User',
      email: email.toLowerCase(),
      password: await bcrypt.hash(password, 10),
      role: 'admin',
      plan: 'pro'
    });

    console.log(`Admin user created:`);
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
    console.log(`  Role: admin`);
    console.log(`  Plan: pro`);
  } else {
    user.role = 'admin';
    user.plan = 'pro';
    await user.save();
    console.log(`User ${email} upgraded to admin with pro plan`);
  }

  await mongoose.disconnect();
  console.log('Done');
}

createAdmin().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
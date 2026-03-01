const mongoose = require('mongoose');
const User = require('./src/models/User');
const dbConnect = require('./src/lib/db');

async function check() {
  await dbConnect();
  const admin = await User.findOne({ email: 'admin' }) || await User.findOne({ role: 'admin' });
  console.log('Admin found:', admin ? admin.email : 'No admin found');
  process.exit(0);
}
check();

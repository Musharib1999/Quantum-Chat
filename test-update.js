import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import User from './src/models/User.js';

const uri = process.env.MONGODB_URI;

async function check() {
  await mongoose.connect(uri);
  const admin = await User.findOne({ role: 'admin' });
  if (admin) {
      console.log('Admin ID:', admin._id);
      const updated = await User.findByIdAndUpdate(admin._id, { tokenLimit: 123456 }, { new: true });
      console.log('Updated Document Keys:', Object.keys(updated.toObject()));
      console.log('Updated Token Limit:', updated.tokenLimit);
      // Restore
      await User.findByIdAndUpdate(admin._id, { tokenLimit: admin.tokenLimit });
  }
  process.exit(0);
}
check();

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import User from './src/models/User.js';

const uri = process.env.MONGODB_URI;

async function check() {
  await mongoose.connect(uri);
  const users = await User.find({});
  console.log('Total users:', users.length);
  const user = users[users.length - 1]; // pick one
  console.log('User before:', user.email, 'tokenLimit:', user.tokenLimit);
  
  const updatedObj = await User.findByIdAndUpdate(user._id, { tokenLimit: 888888 }, { new: true });
  console.log('User after update:', updatedObj.email, 'tokenLimit:', updatedObj.tokenLimit);
  process.exit(0);
}
check();

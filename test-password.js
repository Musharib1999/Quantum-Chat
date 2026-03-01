import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const uri = process.env.MONGODB_URI;

async function check() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const admin = await db.collection('users').findOne({ role: 'admin' });
  console.log('Current Admin Password:', admin ? admin.password : 'Not found');
  process.exit(0);
}
check();

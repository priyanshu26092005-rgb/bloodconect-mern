import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

if (!process.env.MONGODB_URI || !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || !process.env.JWT_SECRET) {
  console.error('Set MONGODB_URI, JWT_SECRET, ADMIN_EMAIL and ADMIN_PASSWORD in .env first.'); process.exit(1);
}
await mongoose.connect(process.env.MONGODB_URI);
const email = process.env.ADMIN_EMAIL.toLowerCase().trim();
const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
await User.findOneAndUpdate({ email }, { name: process.env.ADMIN_NAME || 'BloodConnect Admin', email, passwordHash, role: 'admin' }, { upsert: true, new: true, setDefaultsOnInsert: true });
console.log(`Admin account ready for ${email}. Keep these credentials private.`);
await mongoose.disconnect();

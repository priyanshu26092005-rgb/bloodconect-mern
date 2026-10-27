import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['donor', 'requester', 'admin'], default: 'donor' },
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
  city: { type: String, trim: true, maxlength: 100 },
  pinCode: { type: String, trim: true, match: /^\d{6}$/ },
  phone: { type: String, trim: true, maxlength: 20 },
  availableToContact: { type: Boolean, default: false },
  lastDonationDate: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model('User', userSchema);

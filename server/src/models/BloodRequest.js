import mongoose from 'mongoose';

const bloodRequestSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, required: true, trim: true, maxlength: 80 },
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], required: true },
  units: { type: Number, min: 1, max: 10, required: true },
  hospitalName: { type: String, required: true, trim: true, maxlength: 120 },
  city: { type: String, required: true, trim: true, maxlength: 100 },
  pinCode: { type: String, required: true, match: /^\d{6}$/ },
  neededBy: { type: Date, required: true },
  urgency: { type: String, enum: ['normal', 'urgent'], default: 'normal' },
  status: { type: String, enum: ['pending', 'matched', 'fulfilled', 'cancelled'], default: 'pending' },
  verificationStatus: { type: String, enum: ['unverified', 'verified', 'rejected'], default: 'unverified' },
  interestedDonors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

export default mongoose.model('BloodRequest', bloodRequestSchema);

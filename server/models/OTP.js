const mongoose = require('mongoose');

const OTPSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true },
  otp: { type: String, required: true },
  type: { type: String, enum: ['password_reset', 'email_verification'], default: 'password_reset' },
  expires_at: { type: Date, required: true },
  is_used: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

// Index to automatically delete expired OTPs
OTPSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OTP', OTPSchema);

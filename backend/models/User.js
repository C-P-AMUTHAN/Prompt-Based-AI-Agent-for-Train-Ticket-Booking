const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Basic Info
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
  // Profile Information
  age: { type: Number, default: null },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], default: null },
  phone: { type: String, default: null },
  address: { type: String, default: null },
  aadharNumber: { type: String, default: null },
  
  // Verification Status
  emailVerified: { type: Boolean, default: false },
  
  // OTP Storage (temporary - email only)
  emailOtp: { type: String, default: null },
  emailOtpExpiry: { type: Date, default: null },
  
  // OTP Verification Tracking
  emailOtpAttempts: { type: Number, default: 0 },
  
  // Password Change OTP (for profile and forgot password)
  passwordChangeOtp: { type: String, default: null },
  passwordChangeOtpExpiry: { type: Date, default: null },
  passwordChangeOtpAttempts: { type: Number, default: 0 },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);

const mongoose = require('mongoose');

const bookingSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  source: {
    type: String,
    required: true
  },
  destination: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  trainId: {
    type: String,
    required: true
  },
  trainName: {
    type: String,
    required: true
  },
  trainNumber: {
    type: String,
    required: true
  },
  passengers: [{
    name: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    travelClass: { type: String, required: true }
  }],
  totalCost: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED'],
    default: 'PENDING'
  },
  ticketStatus: {
    type: String,
    enum: ['HOLD', 'CONFIRMED', 'CANCELLED'],
    default: 'HOLD'
  },
  paymentIntentId: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
bookingSessionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('BookingSession', bookingSessionSchema);
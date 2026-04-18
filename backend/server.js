// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const promptRoutes = require('./routes/prompt');
const authRoutes = require('./routes/auth');
const trainRoutes = require("./routes/train");
const ticketRoutes = require("./routes/ticket");
const emailTestRoutes = require('./routes/emailTest');
const stationsRoutes = require('./routes/stations');
const profileRoutes = require('./routes/profile');
const paymentRoutes = require("./routes/payment");
const bookingSessionRoutes = require("./routes/bookingSessions");

// Make jwt available to routes
global.jwt = jwt;

const app = express();
app.use(cors());

// ✅ INCREASED PAYLOAD LIMITS for Base64-encoded PDF uploads
// Default Express limit is 100KB, but Base64 PDFs need more space
// A 2MB PDF becomes ~2.67MB in Base64, so we allow up to 50MB to be safe
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ✅ Global error handler for payload size errors
// Returns JSON response instead of HTML error page
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 413) {
    return res.status(413).json({
      success: false,
      message: 'Payload too large',
      error: 'PDF exceeds maximum allowed size (50MB). Please try a smaller PDF.',
      status: 413
    });
  }
  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON',
      error: err.message,
      status: 400
    });
  }
  next(err);
});

app.use('/api/prompt', promptRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use("/api/trains", trainRoutes);
app.use("/api/tickets", ticketRoutes);
app.use('/api/debug', emailTestRoutes);
app.use('/api/stations', stationsRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/booking-sessions", bookingSessionRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// DB connect with SSL options for MongoDB Atlas
const mongooseOptions = {
  tls: true,
  tlsAllowInvalidCertificates: true,
  tlsAllowInvalidHostnames: true,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  family: 4
};

// Try connecting with different approaches
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/railway-db', mongooseOptions);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.log('🔄 Retrying with simplified options...');

    try {
      // Fallback with minimal options
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/railway-db', {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('✅ MongoDB connected (fallback)');
    } catch (fallbackErr) {
      console.error('❌ MongoDB fallback connection also failed:', fallbackErr.message);
      console.log('⚠️  Continuing without database connection - some features may not work');
    }
  }
};

connectDB();

const port = process.env.PORT || 5000;
// Bind to 0.0.0.0 explicitly so the server listens on all network interfaces
// (helps avoid loopback/IPv6 binding differences on some Windows setups)
app.listen(port, '0.0.0.0', () => console.log(`🚀 Server running on ${port}`));

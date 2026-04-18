const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const app = express();

// Middleware
app.use(express.json());

// Rate limiting for MCP calls
const mcpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.MCP_RATE_LIMIT || 10, // limit each IP to 10 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});

// API Key authentication middleware
const authenticateMCP = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  if (!apiKey || apiKey !== process.env.MCP_API_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or missing API key'
    });
  }

  next();
};

// Apply middleware
app.use('/mcp', mcpLimiter);
app.use('/mcp', authenticateMCP);

// Backend API base URL
const BACKEND_URL = process.env.BACKEND_URL || 'https://railway-backend-uehg.onrender.com';

/**
 * MCP Tool: Search Trains
 * Searches for trains between source and destination on a given date
 */
app.post('/mcp/search-trains', async (req, res) => {
  try {
    const { source, destination, date } = req.body;

    if (!source || !destination || !date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: source, destination, date'
      });
    }

    // Call backend API
    const response = await axios.get(`${BACKEND_URL}/api/trains/live-search`, {
      params: { from: source, to: destination, date }
    });

    res.json({
      success: true,
      trains: response.data,
      count: response.data.length
    });
  } catch (error) {
    console.error('MCP search-trains error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to search trains',
      error: error.message
    });
  }
});

/**
 * MCP Tool: Check Seat Availability
 * Checks availability for a specific train and class
 */
app.post('/mcp/check-availability', async (req, res) => {
  try {
    const { trainId, travelClass, date } = req.body;

    if (!trainId || !travelClass) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: trainId, travelClass'
      });
    }

    // For now, return mock availability since the backend doesn't have real-time availability
    // In production, this would call a real availability API
    const availability = {
      trainId,
      travelClass,
      available: Math.random() > 0.1, // 90% chance of availability
      seatsLeft: Math.floor(Math.random() * 50) + 1,
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      availability
    });
  } catch (error) {
    console.error('MCP check-availability error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to check availability',
      error: error.message
    });
  }
});

/**
 * MCP Tool: Create Booking Session
 * Creates a booking session for AI-assisted booking
 */
app.post('/mcp/create-booking-session', async (req, res) => {
  try {
    const {
      userToken,
      source,
      destination,
      date,
      trainId,
      trainName,
      trainNumber,
      passengers,
      totalCost
    } = req.body;

    if (!userToken || !source || !destination || !date || !trainId || !passengers || !totalCost) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }

    // Call backend API with user token
    const response = await axios.post(`${BACKEND_URL}/api/booking-sessions`, {
      source,
      destination,
      date,
      trainId,
      trainName,
      trainNumber,
      passengers,
      totalCost
    }, {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    res.json({
      success: true,
      session: response.data.session,
      sessionId: response.data.session.sessionId
    });
  } catch (error) {
    console.error('MCP create-booking-session error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create booking session',
      error: error.response?.data || error.message
    });
  }
});

/**
 * MCP Tool: Initiate Payment
 * Initiates UPI collect payment for a booking session
 */
app.post('/mcp/initiate-payment', async (req, res) => {
  try {
    const { userToken, sessionId, upiId } = req.body;

    if (!userToken || !sessionId || !upiId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: userToken, sessionId, upiId'
      });
    }

    // Call backend API
    const response = await axios.post(`${BACKEND_URL}/api/payment/create-intent`, {
      sessionId,
      upiId
    }, {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    res.json({
      success: true,
      paymentLink: response.data.paymentLink,
      paymentId: response.data.paymentId,
      amount: response.data.amount,
      message: 'Payment link generated. User must complete UPI payment within 15 minutes.'
    });
  } catch (error) {
    console.error('MCP initiate-payment error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate payment',
      error: error.response?.data || error.message
    });
  }
});

/**
 * MCP Tool: Confirm Booking
 * Confirms a booking after successful payment
 */
app.post('/mcp/confirm-booking', async (req, res) => {
  try {
    const { userToken, sessionId } = req.body;

    if (!userToken || !sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: userToken, sessionId'
      });
    }

    // Call backend API
    const response = await axios.post(`${BACKEND_URL}/api/booking-sessions/${sessionId}/confirm`, {}, {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    res.json({
      success: true,
      ticket: response.data.ticket,
      pnr: response.data.pnr,
      message: 'Booking confirmed successfully!'
    });
  } catch (error) {
    console.error('MCP confirm-booking error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm booking',
      error: error.response?.data || error.message
    });
  }
});

/**
 * MCP Tool: Get Booking Status
 * Gets the status of a booking session
 */
app.post('/mcp/get-booking-status', async (req, res) => {
  try {
    const { userToken, sessionId } = req.body;

    if (!userToken || !sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: userToken, sessionId'
      });
    }

    // Call backend API
    const response = await axios.get(`${BACKEND_URL}/api/booking-sessions/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    res.json({
      success: true,
      session: response.data.session
    });
  } catch (error) {
    console.error('MCP get-booking-status error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get booking status',
      error: error.response?.data || error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'MCP Server',
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('MCP Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message
  });
});

const PORT = process.env.MCP_PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MCP Server running on port ${PORT}`);
  console.log(`📡 Backend URL: ${BACKEND_URL}`);
});

module.exports = app;
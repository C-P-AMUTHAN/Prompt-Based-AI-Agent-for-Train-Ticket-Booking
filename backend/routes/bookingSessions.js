const express = require('express');
const router = express.Router();
const BookingSession = require('../models/BookingSession');
const Train = require('../models/Train');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * Create a new booking session
 * POST /api/booking-sessions
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      source,
      destination,
      date,
      trainId,
      trainName,
      trainNumber,
      passengers,
      totalCost
    } = req.body;

    // Validate required fields
    if (!source || !destination || !date || !trainId || !trainName || !trainNumber || !passengers || !totalCost) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Generate unique session ID
    const sessionId = `BS${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const bookingSession = new BookingSession({
      sessionId,
      userId: req.userId,
      source,
      destination,
      date: new Date(date),
      trainId,
      trainName,
      trainNumber,
      passengers,
      totalCost,
      paymentStatus: 'PENDING',
      ticketStatus: 'HOLD'
    });

    await bookingSession.save();

    res.status(201).json({
      success: true,
      message: 'Booking session created successfully',
      session: bookingSession
    });
  } catch (err) {
    console.error('Error creating booking session:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to create booking session',
      error: err.message
    });
  }
});

/**
 * Get booking session by sessionId
 * GET /api/booking-sessions/:sessionId
 */
router.get('/:sessionId', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await BookingSession.findOne({
      sessionId,
      userId: req.userId
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Booking session not found'
      });
    }

    res.json({
      success: true,
      session
    });
  } catch (err) {
    console.error('Error fetching booking session:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking session',
      error: err.message
    });
  }
});

/**
 * Update booking session payment status
 * PUT /api/booking-sessions/:sessionId/payment
 */
router.put('/:sessionId/payment', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { paymentStatus, paymentIntentId } = req.body;

    const session = await BookingSession.findOneAndUpdate(
      { sessionId, userId: req.userId },
      {
        paymentStatus,
        paymentIntentId,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Booking session not found'
      });
    }

    res.json({
      success: true,
      message: 'Payment status updated',
      session
    });
  } catch (err) {
    console.error('Error updating payment status:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
      error: err.message
    });
  }
});

/**
 * Confirm booking session (convert to ticket)
 * POST /api/booking-sessions/:sessionId/confirm
 */
router.post('/:sessionId/confirm', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await BookingSession.findOne({
      sessionId,
      userId: req.userId,
      paymentStatus: 'SUCCESS',
      ticketStatus: 'HOLD'
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Booking session not found or not eligible for confirmation'
      });
    }

    // Create ticket from session
    const Ticket = require('../models/Ticket');
    const pnr = "PNR" + Math.floor(Math.random() * 1e9).toString().padStart(9, "0");

    const ticket = new Ticket({
      userId: session.userId,
      pnr,
      from: session.source,
      to: session.destination,
      date: session.date,
      passengers: session.passengers,
      totalCost: session.totalCost,
      trainName: session.trainName,
      trainNumber: session.trainNumber,
      travelClass: session.passengers[0]?.travelClass || 'General',
      transactionId: session.paymentIntentId,
      bookingStatus: 'CONFIRMED',
      currentStatus: 'CONFIRMED'
    });

    await ticket.save();

    // Update session status
    session.ticketStatus = 'CONFIRMED';
    await session.save();

    res.json({
      success: true,
      message: 'Booking confirmed successfully',
      ticket,
      pnr
    });
  } catch (err) {
    console.error('Error confirming booking:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm booking',
      error: err.message
    });
  }
});

/**
 * Cancel booking session
 * POST /api/booking-sessions/:sessionId/cancel
 */
router.post('/:sessionId/cancel', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await BookingSession.findOneAndUpdate(
      { sessionId, userId: req.userId },
      {
        ticketStatus: 'CANCELLED',
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Booking session not found'
      });
    }

    res.json({
      success: true,
      message: 'Booking session cancelled',
      session
    });
  } catch (err) {
    console.error('Error cancelling booking session:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking session',
      error: err.message
    });
  }
});

module.exports = router;
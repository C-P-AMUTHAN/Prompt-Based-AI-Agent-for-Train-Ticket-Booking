const express = require("express");
const crypto = require("crypto");
const razorpay = require("../config/razorpay");
const Ticket = require("../models/Ticket");
const BookingSession = require("../models/BookingSession");
const authMiddleware = require("../middleware/authMiddleware");
const emailService = require("../services/emailService");
// ✅ REMOVED: No longer need backend PDF generation
// const { generateErsTicketPDF } = require("../services/ticketPdfService");
const router = express.Router();

/**
 * 🟢 Create UPI Collect Intent
 * POST /api/payment/create-intent
 * Creates a UPI collect request for AI booking
 */
router.post("/create-intent", authMiddleware, async (req, res) => {
  try {
    const { sessionId, upiId } = req.body;

    if (!sessionId || !upiId) {
      return res.status(400).json({
        success: false,
        message: "sessionId and upiId are required"
      });
    }

    // Get booking session
    const BookingSession = require('../models/BookingSession');
    const session = await BookingSession.findOne({
      sessionId,
      userId: req.userId
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Booking session not found"
      });
    }

    if (session.paymentStatus !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: "Payment already initiated for this session"
      });
    }

    // Create UPI collect request
    const collectRequest = await razorpay.paymentLink.create({
      amount: Math.round(session.totalCost * 100), // ₹ → paise
      currency: "INR",
      accept_partial: false,
      first_min_partial_amount: 0,
      expire_by: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
      reference_id: sessionId,
      description: `Railway Ticket Booking - ${session.trainName}`,
      customer: {
        name: req.user.name,
        email: req.user.email,
        contact: req.user.phone || ""
      },
      notify: {
        sms: true,
        email: true
      },
      reminder_enable: true,
      notes: {
        sessionId: sessionId,
        userId: req.userId.toString(),
        upiId: upiId
      },
      callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/callback`,
      callback_method: "get"
    });

    // Update session with payment intent ID
    session.paymentIntentId = collectRequest.id;
    await session.save();

    console.log("✅ UPI Collect Intent Created:", collectRequest.id);

    res.status(200).json({
      success: true,
      paymentLink: collectRequest.short_url,
      paymentId: collectRequest.id,
      amount: session.totalCost,
      expiresAt: collectRequest.expire_by
    });
  } catch (err) {
    console.error("❌ UPI Collect Intent creation failed:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create payment intent",
      error: err.message
    });
  }
});

/**
 * 🟢 Create Razorpay Order
 * POST /api/payment/create-order
 * Creates an order for the payment
 */
router.post("/create-order", async (req, res) => {
  try {
    const { amount, bookingData } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // ₹ → paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        from: bookingData?.from || "N/A",
        to: bookingData?.to || "N/A",
        email: bookingData?.email || "N/A",
        passengers: bookingData?.passengers?.length || 0
      }
    });

    console.log("✅ Razorpay Order Created:", order.id);
    res.status(200).json(order);
  } catch (err) {
    console.error("❌ Order creation failed:", err);
    res.status(500).json({ message: "Order creation failed", error: err.message });
  }
});

/**
 * 🟢 Verify Razorpay Payment Signature
 * POST /api/payment/verify
 * Verifies payment signature and creates ticket
 */
router.post("/verify", async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      bookingData 
    } = req.body;

    console.log("🔍 Payment verification request:", { razorpay_order_id, razorpay_payment_id, bookingData });

    // Verify signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      console.error("❌ Signature verification failed");
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    console.log("✅ Signature verified for payment:", razorpay_payment_id);

    // Generate PNR (if not already provided)
    const pnr = "PNR" + Math.floor(Math.random() * 1e9).toString().padStart(9, "0");

    // Create ticket in database (with fallback for connection issues)
    let ticket;
    try {
      const travelDate = bookingData.travel_date || bookingData.date;
      if (!travelDate) {
        throw new Error('Travel date is required for ticket creation');
      }
      
      ticket = new Ticket({
        pnr,
        from: bookingData.from || bookingData.source_station,
        to: bookingData.to || bookingData.destination_station,
        email: bookingData.email || (bookingData.passengers && bookingData.passengers[0]?.email) || '',
        phone: bookingData.phone || (bookingData.passengers && bookingData.passengers[0]?.phone) || '',
        date: new Date(travelDate),
        passengers: bookingData.passengers,
        totalCost: bookingData.totalCost,
        trainName: bookingData.trainName,
        trainNumber: bookingData.trainNumber,
        distance: bookingData.distance,
        departureTime: bookingData.departureTime,
        arrivalTime: bookingData.arrivalTime,
        travelClass: bookingData.travelClass,
        transactionId: razorpay_payment_id,
        pgCharges: bookingData.pgCharges || 0,
        convenienceFee: bookingData.convenienceFee || 23.60,
        bookingStatus: "CONFIRMED",
        currentStatus: "CONFIRMED",
        bookedAt: new Date()
      });

      await ticket.save();
      console.log("✅ Ticket saved with PNR:", pnr);
    } catch (dbError) {
      console.error("❌ Database save failed:", dbError.message);
      console.log("⚠️  Continuing with in-memory ticket storage...");
      
      // Create ticket object without saving to database
      ticket = {
        pnr,
        from: bookingData.from || bookingData.source_station,
        to: bookingData.to || bookingData.destination_station,
        email: bookingData.email || (bookingData.passengers && bookingData.passengers[0]?.email) || '',
        phone: bookingData.phone || (bookingData.passengers && bookingData.passengers[0]?.phone) || '',
        date: new Date(bookingData.travel_date || bookingData.date),
        passengers: bookingData.passengers,
        totalCost: bookingData.totalCost,
        trainName: bookingData.trainName,
        trainNumber: bookingData.trainNumber,
        distance: bookingData.distance,
        departureTime: bookingData.departureTime,
        arrivalTime: bookingData.arrivalTime,
        travelClass: bookingData.travelClass,
        transactionId: razorpay_payment_id,
        pgCharges: bookingData.pgCharges || 0,
        convenienceFee: bookingData.convenienceFee || 23.60,
        bookingStatus: "CONFIRMED",
        currentStatus: "CONFIRMED",
        bookedAt: new Date(),
        toObject: () => ticket // Mock toObject method
      };
    }

    // ✅ PDF will be uploaded by frontend after payment confirmation
    // The frontend generates the PDF using TicketSlip component
    // and uploads it separately via POST /api/payment/upload-pdf
    console.log("📧 Waiting for frontend to upload PDF for email attachment...");

    res.json({ 
      success: true, 
      message: "Payment verified and ticket created",
      ticket: ticket.toObject() // Return full ticket object
    });
  } catch (err) {
    console.error("❌ Verification error:", err);
    res.status(500).json({ success: false, message: "Verification failed", error: err.message });
  }
});

/**
 * 🟢 Get Payment Status
 * GET /api/payment/status/:paymentId
 * Get status of a payment
 */
router.get("/status/:paymentId", async (req, res) => {
  try {
    const payment = await razorpay.payments.fetch(req.params.paymentId);
    res.json({
      status: payment.status,
      amount: payment.amount / 100, // paise → ₹
      currency: payment.currency,
      method: payment.method,
      email: payment.email,
      contact: payment.contact,
      created_at: payment.created_at
    });
  } catch (err) {
    res.status(400).json({ message: "Failed to fetch payment", error: err.message });
  }
});

/**
 * 🟢 Upload Ticket PDF from Frontend
 * POST /api/payment/upload-pdf
 * Receives PDF generated by frontend (TicketSlip UI)
 * Stores it temporarily and sends confirmation email
 */
router.post("/upload-pdf", async (req, res) => {
  try {
    const { pnr, email, pdfBase64 } = req.body;

    if (!pnr || !pdfBase64) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields: pnr, pdfBase64" 
      });
    }

    console.log("📥 Received PDF from frontend for PNR:", pnr, "Email:", email || "not provided");

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    console.log("✅ PDF buffer created:", pdfBuffer.length, "bytes");

    if (pdfBuffer.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "PDF buffer is empty" 
      });
    }

    // Send confirmation email with frontend-generated PDF (only if email provided)
    if (email && email.trim()) {
      try {
        console.log("📧 Sending confirmation email with PDF to:", email);
        
        // Construct ticket object from request data
        const ticket = {
          pnr,
          from: req.body.from,
          to: req.body.to,
          email: email,
          passengers: req.body.passengers || [],
          totalCost: req.body.totalCost,
          trainName: req.body.trainName,
          trainNumber: req.body.trainNumber,
          date: req.body.date ? new Date(req.body.date) : new Date(),
          travelClass: req.body.class,
          bookedAt: new Date(),
          toObject: () => ({
            pnr,
            from: req.body.from,
            to: req.body.to,
            email: email,
            passengers: req.body.passengers || [],
            totalCost: req.body.totalCost,
            trainName: req.body.trainName,
            trainNumber: req.body.trainNumber,
            date: req.body.date ? new Date(req.body.date) : new Date(),
            travelClass: req.body.class,
            bookedAt: new Date()
          })
        };
        
        const ticketWithPdf = { 
          ...ticket.toObject(), 
          pdfBuffer,
          email
        };
        
        await emailService.sendTicketEmail(ticketWithPdf);
        console.log("✅ Confirmation email sent to:", email);

        res.json({ 
          success: true, 
          message: "PDF received and confirmation email sent",
          pnr,
          pdfSize: pdfBuffer.length,
          emailSent: true
        });
      } catch (emailError) {
        console.error("❌ Email sending failed:", emailError.message);
        // Still return success since PDF was processed
        res.json({ 
          success: true, 
          message: "PDF received but email sending failed",
          pnr,
          pdfSize: pdfBuffer.length,
          emailSent: false,
          emailError: emailError.message
        });
      }
    } else {
      console.log("ℹ️ No email provided, skipping email sending");

      res.json({ 
        success: true, 
        message: "PDF received (no email provided)",
        pnr,
        pdfSize: pdfBuffer.length,
        emailSent: false
      });
    }
  } catch (err) {
    console.error("❌ PDF upload error:", err);
    res.status(500).json({ 
      success: false, 
      message: "PDF upload failed", 
      error: err.message 
    });
  }
});

/**
 * 🟢 Refund Payment
 * POST /api/payment/refund
 * Refund a completed payment
 */
router.post("/refund", async (req, res) => {
  try {
    const { paymentId, amount } = req.body;

    const refund = await razorpay.payments.refund(paymentId, {
      amount: amount ? Math.round(amount * 100) : undefined,
      notes: {
        reason: "Ticket cancellation",
        timestamp: new Date().toISOString()
      }
    });

    console.log("✅ Refund processed:", refund.id);
    
    res.json({
      success: true,
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount / 100 // paise → ₹
    });
  } catch (err) {
    console.error("❌ Refund failed:", err);
    res.status(400).json({ message: "Refund failed", error: err.message });
  }
});

/**
 * 🟢 Razorpay Webhook Handler
 * POST /api/payment/webhook
 * Handles payment success/failure events
 */
router.post("/webhook", async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    const receivedSignature = req.headers["x-razorpay-signature"];

    if (expectedSignature !== receivedSignature) {
      console.error("❌ Webhook signature verification failed");
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    const event = req.body.event;
    const paymentEntity = req.body.payload.payment.entity;

    console.log("🔍 Webhook received:", event, "Payment ID:", paymentEntity.id);

    if (event === "payment.captured") {
      // Payment successful - update booking session and confirm ticket
      const referenceId = paymentEntity.notes?.sessionId;

      if (referenceId) {
        const session = await BookingSession.findOne({ sessionId: referenceId });

        if (session) {
          // Update payment status
          session.paymentStatus = 'SUCCESS';
          await session.save();

          // Auto-confirm the booking
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
            transactionId: paymentEntity.id,
            bookingStatus: 'CONFIRMED',
            currentStatus: 'CONFIRMED'
          });

          await ticket.save();

          // Update session status
          session.ticketStatus = 'CONFIRMED';
          await session.save();

          console.log("✅ Booking confirmed via webhook:", pnr);
        }
      }
    } else if (event === "payment.failed") {
      // Payment failed - update booking session
      const referenceId = paymentEntity.notes?.sessionId;

      if (referenceId) {
        await BookingSession.findOneAndUpdate(
          { sessionId: referenceId },
          { paymentStatus: 'FAILED' }
        );

        console.log("❌ Payment failed for session:", referenceId);
      }
    }

    res.status(200).json({ success: true, message: "Webhook processed" });
  } catch (err) {
    console.error("❌ Webhook processing failed:", err);
    res.status(500).json({
      success: false,
      message: "Webhook processing failed",
      error: err.message
    });
  }
});

module.exports = router;

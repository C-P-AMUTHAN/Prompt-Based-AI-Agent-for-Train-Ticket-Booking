const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const Train = require('../models/Train');
const PDFDocument = require('pdfkit');
const { sendTicketEmail } = require('../services/emailService');
const { generateErsTicketPDF } = require('../services/ticketPdfService');

const jwt = require('jsonwebtoken');
const { Readable } = require('stream');

// Helper: Generate PDF and return as buffer
const generatePDFBuffer = async (ticket) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 30 });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // normalize values for PDF generation
      const from = ticket.from || '-';
      const to = ticket.to || '-';
      const pnr = ticket.pnr || (`PNR${Math.floor(Math.random()*1e9)}`);
      const trainNumber = ticket.trainNumber || '';
      const trainName = ticket.trainName || '';
      const trainDisplay = trainNumber && trainName ? `${trainNumber} / ${trainName}` : 
                          trainNumber ? trainNumber : 
                          trainName ? trainName : 'TRAIN NAME / NO';
      const travelClass = ticket.travelClass || (ticket.passengers && ticket.passengers[0] && ticket.passengers[0].travelClass) || '-';
      const quota = ticket.quota || 'GENERAL (GN)';
      const distance = ticket.distance || 0;
      const departureTime = ticket.departureTime || '';
      const arrivalTime = ticket.arrivalTime || '';
      const bookingDate = ticket.bookedAt ? new Date(ticket.bookedAt) : new Date();
      const travelDate = ticket.date ? new Date(ticket.date) : null;
      const dateText = travelDate ? travelDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
      const passengers = Array.isArray(ticket.passengers) ? ticket.passengers : [];
      const totalFare = ticket.totalCost != null ? ticket.totalCost : 0;
      const convenienceFee = ticket.convenienceFee || 23.60;
      const pgCharges = ticket.pgCharges || 0;
      const transactionId = ticket.transactionId || `10000${Math.floor(Math.random()*1e9)}`;
      const invoiceNumber = ticket.invoiceNumber || `PS24${pnr.slice(-11)}`;
      const gstin = ticket.gstin || '07AAAGM0289C1ZL';
      const contact = ticket.phone || ticket.email || '-';

      // Generate PDF content (reuse existing PDF generation logic)
      doc.font('Helvetica-Bold').fontSize(14).text('INDIAN RAILWAYS', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`PNR: ${pnr}`, { align: 'left' });
      doc.moveDown();
      doc.text(`From: ${from}`);
      doc.text(`To: ${to}`);
      doc.text(`Date: ${dateText}`);
      doc.moveDown();
      doc.text('Passenger Details:');
      passengers.forEach((p, i) => {
        doc.text(`${i + 1}. ${p.name} (${p.age}, ${p.gender}) - ${p.travelClass || travelClass}`);
      });
      doc.moveDown();
      doc.text(`Total Fare: ₹${totalFare}`);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// POST /api/tickets
router.post('/', async (req, res) => {
  try {
  const payload = { ...req.body };
  console.log('[ticket.js] Incoming ticket payload:', payload);

    // Try to attach userId from Authorization Bearer token if available
    const auth = req.headers.authorization || req.headers.Authorization;
    if (!payload.userId && auth && auth.startsWith('Bearer ')) {
      try {
        const token = auth.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // adjust depending on your token shape
        payload.userId = decoded && (decoded.id || decoded._id || decoded.userId) ? (decoded.id || decoded._id || decoded.userId) : undefined;
      } catch (e) {
        // ignore token errors
      }
    }

    // If from/to/date missing but trainId provided, populate from train doc
    if ((!payload.from || !payload.to || !payload.date) && payload.trainId) {
      try {
        const train = await Train.findById(payload.trainId).lean();
        if (train) {
          payload.from = payload.from || train.from;
          payload.to = payload.to || train.to;
          // if train has a date or you want to use payload.date, prefer payload.date
          payload.date = payload.date || train.date || payload.date;
        }
      } catch (e) {
        console.warn('Could not populate train data for ticket:', e.message || e);
      }
    }

    // Normalize date if provided (accept ISO string)
    if (payload.date) payload.date = new Date(payload.date);

  // Ensure email/phone are present on payload (some clients may send nested fields)
  if (!payload.email && req.body && req.body.email) payload.email = req.body.email;
  if (!payload.phone && req.body && req.body.phone) payload.phone = req.body.phone;

  const ticket = new Ticket(payload);
     const saved = await ticket.save();

     // Generate PDF buffer for email attachment using new ERS format
     try {
       console.log('[ticket.js] Starting PDF generation for ticket:', saved._id);
       const pdfBuffer = await generateErsTicketPDF(saved.toObject());
       console.log('[ticket.js] PDF generated successfully, size:', pdfBuffer ? pdfBuffer.length : 'null', 'bytes');
       
       // Send confirmation email with PDF attachment if email is provided
      if (saved.email) {
        console.log('[ticket.js] Attempting to send confirmation email to:', saved.email);
        console.log('[ticket.js] PDF buffer being passed:', pdfBuffer ? `${pdfBuffer.length} bytes` : 'null');
        const emailData = { ...saved.toObject(), pdfBuffer };
        const emailResult = await sendTicketEmail(emailData);
        console.log('[ticket.js] Email send result:', emailResult);
      } else {
        console.log('[ticket.js] No email provided on ticket, skipping email send');
      }
     } catch (emailError) {
       console.error('[ticket.js] Error in PDF generation or email send:', emailError);
       // Don't fail the request if email fails
     }

     const pdfUrl = `/api/tickets/${saved._id}/pdf`;
    return res.status(201).json({ ...saved.toObject(), pdfUrl });
  } catch (err) {
    console.error('Save ticket error:', err);
    // return validation details for debugging
    return res.status(500).json({ message: 'Failed to save ticket', error: err && err.toString ? err.toString() : err });
  }
});

// generate and return ticket PDF (ERS full layout)
router.get('/:id/pdf', async (req, res) => {
  try {
    const id = req.params.id;
    const ticket = await Ticket.findById(id).lean();
    if (!ticket) return res.status(404).send('Ticket not found');

    // Generate ERS PDF using the new service
    const pdfBuffer = await generateErsTicketPDF(ticket);
    const pnr = ticket.pnr || `PNR${Math.floor(Math.random()*1e9)}`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="ticket-${pnr}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).send('Failed to generate PDF');
  }
});

// Get all tickets for a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Find all tickets for the user
    const tickets = await Ticket.find({ userId: userId }).sort({ bookedAt: -1 });

    res.status(200).json({ 
      success: true, 
      tickets: tickets || [],
      count: tickets.length 
    });
  } catch (err) {
    console.error('Error fetching user tickets:', err);
    res.status(500).json({ message: 'Failed to fetch tickets', error: err.message });
  }
});

// Link existing tickets to user by matching email/phone
router.post('/link-tickets/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Find user to get their email and phone
    const User = require('../models/User');
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find all tickets with matching email or phone that don't have a userId
    const matchingTickets = await Ticket.find({
      $or: [
        { email: user.email, userId: { $exists: false } },
        { email: user.email, userId: null },
        { phone: user.phone, userId: { $exists: false } },
        { phone: user.phone, userId: null }
      ]
    });

    if (matchingTickets.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'No unlinked tickets found', 
        updated: 0 
      });
    }

    // Update all matching tickets with userId
    const updateResult = await Ticket.updateMany(
      {
        $or: [
          { email: user.email, userId: { $exists: false } },
          { email: user.email, userId: null },
          { phone: user.phone, userId: { $exists: false } },
          { phone: user.phone, userId: null }
        ]
      },
      { userId: userId }
    );

    res.status(200).json({ 
      success: true, 
      message: `Linked ${updateResult.modifiedCount} tickets to user`,
      updated: updateResult.modifiedCount 
    });
  } catch (err) {
    console.error('Error linking tickets:', err);
    res.status(500).json({ message: 'Failed to link tickets', error: err.message });
  }
});

module.exports = router;

// Test endpoint for PDF attachment debugging
const testPdfEndpoint = async (req, res) => {
  try {
    console.log('[TEST] Testing PDF generation and email with attachment...');
    
    // Create a test ticket object
    const testTicket = {
      _id: 'test-123',
      pnr: 'TEST1234567890',
      from: 'NEW DELHI',
      to: 'MUMBAI',
      date: new Date(),
      bookedAt: new Date(),
      email: 'test@example.com',
      passengers: [
        { name: 'John Doe', age: 30, gender: 'M' }
      ],
      trainNumber: '12345',
      trainName: 'TEST EXPRESS',
      travelClass: 'Sleeper',
      quota: 'GENERAL',
      distance: 1000,
      departureTime: '10:00',
      arrivalTime: '18:00',
      totalCost: 500,
      convenienceFee: 20,
      pgCharges: 0
    };

    console.log('[TEST] Generating PDF for test ticket...');
    const pdfBuffer = await generateErsTicketPDF(testTicket);
    console.log('[TEST] PDF generated:', pdfBuffer ? `${pdfBuffer.length} bytes` : 'null');

    console.log('[TEST] Sending test email with PDF...');
    const emailResult = await sendTicketEmail({ ...testTicket, pdfBuffer });
    console.log('[TEST] Email result:', emailResult);

    res.status(200).json({ 
      success: true, 
      pdfSize: pdfBuffer ? pdfBuffer.length : null,
      emailResult 
    });
  } catch (error) {
    console.error('[TEST] Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Export test endpoint if needed
router.get('/test/pdf-email', testPdfEndpoint);

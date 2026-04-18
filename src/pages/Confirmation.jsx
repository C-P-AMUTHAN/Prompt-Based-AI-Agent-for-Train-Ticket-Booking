import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import TicketSlip from '../components/TicketSlip';
import NotificationModal from '../components/NotificationModal';
import BackButton from '../components/BackButton';

const Confirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showTicketSlip, setShowTicketSlip] = useState(false);
  const [isTicketReady, setIsTicketReady] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [notification, setNotification] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const ticketSlipRef = useRef(null);

  // Get ticket data from payment success
  const { ticket: backendTicket, bookingData, paymentId } = location.state || {};

  // Merge backend ticket with booking data to have complete ticket object
  const ticket = backendTicket && bookingData 
    ? {
        // Backend ticket data (has _id, pnr, transactionId, etc.)
        ...backendTicket,
        // Booking data (has from, to, passengers, trainName, etc.)
        ...bookingData,
        // Ensure we use backend values for critical fields
        _id: backendTicket._id,
        pnr: backendTicket.pnr,
        email: backendTicket.email,
        transactionId: backendTicket.transactionId,
        totalCost: backendTicket.totalCost || bookingData.totalCost,
      }
    : backendTicket;

  // Redirect if no ticket data
  useEffect(() => {
    if (!ticket) {
      navigate('/');
    } else {
      // Wait for the DOM to fully paint before marking ticket as ready
      // Use requestAnimationFrame instead of setTimeout for better timing
      const frameId = requestAnimationFrame(() => {
        const timer = setTimeout(() => {
          setIsTicketReady(true);
          console.log('✅ Ticket ready for PDF generation');
        }, 300);
        return () => clearTimeout(timer);
      });
      return () => cancelAnimationFrame(frameId);
    }
  }, [ticket, navigate]);

  if (!ticket || !bookingData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  const cardStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(12px)',
    padding: '2.5rem',
    borderRadius: '1rem',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    maxWidth: '700px',
    width: '100%',
  };

  const titleStyle = {
    fontSize: '2.5rem',
    fontWeight: '800',
    color: 'transparent',
    background: 'linear-gradient(to right, #059669, #10b981)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    marginBottom: '1rem',
    textAlign: 'center',
  };

  const subtitleStyle = {
    color: '#6b7280',
    fontSize: '1rem',
    textAlign: 'center',
    marginBottom: '2rem',
  };

  const ticketDetailsStyle = {
    backgroundColor: '#f0fdf4',
    border: '2px solid #86efac',
    padding: '1.5rem',
    borderRadius: '0.75rem',
    marginBottom: '1.5rem',
  };

  const pnrStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    marginBottom: '1rem',
    paddingBottom: '1rem',
    borderBottom: '2px solid #86efac',
  };

  const pnrLabelStyle = {
    color: '#666',
    fontSize: '0.9rem',
  };

  const pnrValueStyle = {
    fontSize: '1.8rem',
    fontWeight: '800',
    color: '#059669',
    fontFamily: 'monospace',
    letterSpacing: '2px',
  };

  const detailRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.75rem 0',
    borderBottom: '1px solid #d1fae5',
  };

  const detailLabelStyle = {
    fontWeight: '600',
    color: '#374151',
    fontSize: '0.95rem',
  };

  const detailValueStyle = {
    color: '#1f2937',
    fontSize: '0.95rem',
  };

  const journeyCardStyle = {
    backgroundColor: '#f3f4f6',
    padding: '1.5rem',
    borderRadius: '0.75rem',
    marginBottom: '1.5rem',
    border: '1px solid #e5e7eb',
  };

  const journeyHeaderStyle = {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '1rem',
  };

  const routeStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: '1rem 0',
  };

  const stationStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  };

  const stationNameStyle = {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#4f46e5',
  };

  const timeStyle = {
    fontSize: '0.85rem',
    color: '#6b7280',
    marginTop: '0.25rem',
  };

  const arrowStyle = {
    fontSize: '1.5rem',
    color: '#9ca3af',
  };

  const passengerListStyle = {
    backgroundColor: '#fef3c7',
    padding: '1.5rem',
    borderRadius: '0.75rem',
    marginBottom: '1.5rem',
    border: '1px solid #fcd34d',
  };

  const passengerHeaderStyle = {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#92400e',
    marginBottom: '1rem',
  };

  const passengerItemStyle = {
    padding: '0.75rem',
    backgroundColor: '#fffbeb',
    borderRadius: '0.5rem',
    marginBottom: '0.5rem',
    fontSize: '0.95rem',
    color: '#b45309',
  };

  const costBreakdownStyle = {
    backgroundColor: '#f0f9ff',
    padding: '1.5rem',
    borderRadius: '0.75rem',
    marginBottom: '1.5rem',
    border: '1px solid #bfdbfe',
  };

  const costHeaderStyle = {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#0c4a6e',
    marginBottom: '1rem',
  };

  const costRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.5rem 0',
    fontSize: '0.95rem',
    color: '#0369a1',
  };

  const totalRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '1rem 0',
    borderTop: '2px solid #bfdbfe',
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#0c4a6e',
    marginTop: '0.5rem',
  };

  const buttonsContainerStyle = {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: '2rem',
  };

  const primaryButtonStyle = {
    backgroundColor: '#4f46e5',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '0.5rem',
    fontSize: '0.95rem',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s',
  };

  const secondaryButtonStyle = {
    backgroundColor: 'white',
    color: '#4f46e5',
    padding: '0.75rem 1.5rem',
    borderRadius: '0.5rem',
    fontSize: '0.95rem',
    fontWeight: '600',
    border: '2px solid #4f46e5',
    cursor: 'pointer',
    transition: 'all 0.3s',
  };

  const handleDownloadTicket = async () => {
    try {
      console.log('📥 Starting PDF generation from TicketSlip...');
      
      if (!isTicketReady) {
        throw new Error('Ticket is not ready. Please wait a moment and try again.');
      }

      if (!ticketSlipRef.current) {
        throw new Error('Hidden TicketSlip reference not available');
      }

      console.log('📋 Ticket data:', {
        pnr: ticket?.pnr,
        from: ticket?.from,
        to: ticket?.to,
        date: ticket?.date,
        passengers: ticket?.passengers?.length,
      });

      // Find the ticket-slip-content div
      const element = ticketSlipRef.current.querySelector('.ticket-slip-content');
      
      if (!element) {
        console.error('❌ Ticket content element not found');
        console.log('Container HTML:', ticketSlipRef.current.innerHTML.substring(0, 200));
        throw new Error('Ticket content not found in DOM. The ticket component may not have rendered.');
      }

      // Verify element is visible and has dimensions
      const rect = element.getBoundingClientRect();
      console.log('✅ Element found and visible');
      console.log('📐 Element dimensions:', {
        width: rect.width,
        height: rect.height,
        offsetWidth: element.offsetWidth,
        offsetHeight: element.offsetHeight,
      });

      if (element.offsetWidth === 0 || element.offsetHeight === 0) {
        throw new Error('Ticket element has zero dimensions. DOM may not be fully rendered.');
      }

      // Capture the element with html2canvas
      console.log('📸 Capturing ticket element with html2canvas...');
      const canvas = await html2canvas(element, {
        allowTaint: true,
        useCORS: true,
        backgroundColor: '#ffffff',
        scale: 2, // 2x for better quality
        logging: false,
        imageTimeout: 5000,
        timeout: 10000,
      });

      console.log('✅ Canvas created:', {
        width: canvas.width,
        height: canvas.height,
      });

      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas has zero dimensions after capture.');
      }

      // Convert canvas to image data
      const imgData = canvas.toDataURL('image/png');
      if (!imgData || imgData.length < 1000) {
        throw new Error('Generated image data is too small or invalid.');
      }
      console.log('✅ Image data generated:', imgData.substring(0, 50) + '...');

      // Create PDF with proper multi-page handling
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      console.log('📄 Creating PDF with dimensions:', {
        imgWidth,
        pageHeight,
        imgHeight,
        pages: Math.ceil(imgHeight / pageHeight),
      });

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      // Add additional pages if needed
      let heightLeft = imgHeight - pageHeight;
      let position = 0;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Convert PDF to Base64 for upload
      console.log('🔄 Converting PDF to Base64...');
      const pdfBase64 = pdf.output('dataurlstring').split(',')[1]; // Extract base64 part
      console.log('✅ PDF Base64 generated:', pdfBase64.substring(0, 50) + '...');

      // Download the PDF locally
      const filename = `ticket_${ticket.pnr}.pdf`;
      pdf.save(filename);
      console.log('✅ PDF downloaded locally:', filename);

      // Upload PDF to backend
      console.log('📤 Uploading PDF to backend...');
      setUploadingPdf(true);

      const uploadResponse = await fetch('/api/payment/upload-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pnr: ticket.pnr,
          email: ticket.email,
          pdfBase64: pdfBase64,
        }),
      });

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(uploadData.message || uploadData.error || 'Failed to upload PDF to backend');
      }

      console.log('✅ PDF uploaded successfully:', uploadData);
      setUploadingPdf(false);

      setNotification({
        isOpen: true,
        title: 'Success!',
        message: 'Ticket PDF downloaded and confirmation email sent successfully!\n\nCheck your Downloads folder and email inbox.',
        type: 'success'
      });
    } catch (err) {
      console.error('❌ PDF generation/upload error:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
      });
      setUploadingPdf(false);
      
      // Provide specific error messages
      let errorMessage = err.message;
      if (err.message.includes('413') || err.message.includes('Payload Too Large')) {
        errorMessage = 'PDF is too large to upload. Please try a smaller ticket or contact support.';
      } else if (err.message.includes('SyntaxError')) {
        errorMessage = 'Backend error: Please try again in a moment.';
      }
      
      setNotification({
        isOpen: true,
        title: 'Error',
        message: `Failed to process ticket: ${errorMessage}\n\nPlease try again in a moment.`,
        type: 'error'
      });
    }
  };

  return (
    <>
      <BackButton to="/" label="← Back to Home" />
      
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      background: 'linear-gradient(to bottom right, #dbeafe, #e0e7ff, #f3e8ff)',
      padding: '1rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <motion.div
        style={cardStyle}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header */}
        <motion.h1
          style={titleStyle}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          ✅ Booking Confirmed!
        </motion.h1>
        <p style={subtitleStyle}>
          Your ticket has been successfully booked and a confirmation email has been sent.
        </p>

        {/* Ticket Details */}
        <motion.div
          style={ticketDetailsStyle}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div style={pnrStyle}>
            <span style={pnrLabelStyle}>Your PNR Number:</span>
            <span style={pnrValueStyle}>{ticket.pnr}</span>
          </div>

          <div style={detailRowStyle}>
            <span style={detailLabelStyle}>📅 Booking Date:</span>
            <span style={detailValueStyle}>
              {new Date(ticket.bookedAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>

          <div style={detailRowStyle}>
            <span style={detailLabelStyle}>💳 Transaction ID:</span>
            <span style={detailValueStyle} title={paymentId}>
              {paymentId?.substring(0, 15)}...
            </span>
          </div>

          <div style={{ ...detailRowStyle, borderBottom: 'none' }}>
            <span style={detailLabelStyle}>🎫 Status:</span>
            <span style={{ ...detailValueStyle, color: '#059669', fontWeight: '600' }}>
              CONFIRMED
            </span>
          </div>
        </motion.div>

        {/* Journey Details */}
        <motion.div
          style={journeyCardStyle}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div style={journeyHeaderStyle}>🚂 Journey Details</div>

          <div style={routeStyle}>
            <div style={stationStyle}>
              <div style={stationNameStyle}>{bookingData.from}</div>
              <div style={timeStyle}>{bookingData.departureTime}</div>
            </div>
            <div style={arrowStyle}>→</div>
            <div style={stationStyle}>
              <div style={stationNameStyle}>{bookingData.to}</div>
              <div style={timeStyle}>{bookingData.arrivalTime}</div>
            </div>
          </div>

          <div style={{ ...detailRowStyle, borderBottom: '1px solid #d1d5db', marginTop: '1rem' }}>
            <span style={detailLabelStyle}>Train:</span>
            <span style={detailValueStyle}>{bookingData.trainName} ({bookingData.trainNumber})</span>
          </div>

          <div style={{ ...detailRowStyle, borderBottom: '1px solid #d1d5db' }}>
            <span style={detailLabelStyle}>Travel Date:</span>
            <span style={detailValueStyle}>
              {new Date(bookingData.date).toLocaleDateString('en-IN', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>

          <div style={{ ...detailRowStyle, borderBottom: 'none' }}>
            <span style={detailLabelStyle}>Distance:</span>
            <span style={detailValueStyle}>{bookingData.distance} km</span>
          </div>
        </motion.div>

        {/* Passengers */}
        <motion.div
          style={passengerListStyle}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div style={passengerHeaderStyle}>👥 Passengers ({bookingData.passengers.length})</div>
          {bookingData.passengers.map((p, idx) => (
            <div key={idx} style={passengerItemStyle}>
              {idx + 1}. {p.name} • {p.age} yrs • {p.gender} • {p.travelClass}
            </div>
          ))}
        </motion.div>

        {/* Cost Breakdown */}
        <motion.div
          style={costBreakdownStyle}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <div style={costHeaderStyle}>💰 Cost Breakdown</div>

          <div style={costRowStyle}>
            <span>Base Fare:</span>
            <span>₹{(bookingData.totalCost - bookingData.convenienceFee).toFixed(2)}</span>
          </div>

          {bookingData.convenienceFee > 0 && (
            <div style={costRowStyle}>
              <span>Convenience Fee (2.5%):</span>
              <span>₹{bookingData.convenienceFee.toFixed(2)}</span>
            </div>
          )}

          {bookingData.pgCharges > 0 && (
            <div style={costRowStyle}>
              <span>Payment Gateway Charges:</span>
              <span>₹{bookingData.pgCharges.toFixed(2)}</span>
            </div>
          )}

          <div style={totalRowStyle}>
            <span>Total Amount Paid:</span>
            <span>₹{bookingData.totalCost.toFixed(2)}</span>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          style={buttonsContainerStyle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <motion.button
            onClick={() => setShowTicketSlip(true)}
            style={primaryButtonStyle}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            🎫 View Full Ticket Details
          </motion.button>

          <motion.button
            onClick={handleDownloadTicket}
            style={{...primaryButtonStyle, opacity: (isTicketReady && !uploadingPdf) ? 1 : 0.6, cursor: (isTicketReady && !uploadingPdf) ? 'pointer' : 'not-allowed'}}
            whileHover={(isTicketReady && !uploadingPdf) ? { scale: 1.05 } : {}}
            whileTap={(isTicketReady && !uploadingPdf) ? { scale: 0.95 } : {}}
            disabled={!isTicketReady || uploadingPdf}
          >
            {uploadingPdf ? '⏳ Preparing Email...' : '📥 Download Ticket PDF'}
          </motion.button>

          <motion.button
            onClick={() => navigate('/bookings')}
            style={secondaryButtonStyle}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            📋 View All Bookings
          </motion.button>

          <motion.button
            onClick={() => navigate('/')}
            style={secondaryButtonStyle}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            🏠 Back to Home
          </motion.button>
        </motion.div>

        {/* Help Text */}
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#f3f4f6',
          borderRadius: '0.5rem',
          textAlign: 'center',
          fontSize: '0.85rem',
          color: '#6b7280',
          borderLeft: '4px solid #4f46e5',
        }}>
          <p style={{ margin: '0.25rem 0' }}>
            💡 Keep your PNR number safe for check-in and entry to the station.
          </p>
          <p style={{ margin: '0.25rem 0' }}>
            📧 A detailed confirmation email has been sent to <strong>{bookingData.email}</strong>
          </p>
        </div>
      </motion.div>

      {/* Hidden TicketSlip for PDF Generation - Single Source of Truth */}
      {/* IMPORTANT: Use off-screen positioning ONLY, not visibility:hidden */}
      {/* html2canvas CANNOT capture hidden/invisible elements */}
      <div 
        ref={ticketSlipRef}
        style={{
          position: 'fixed',
          left: '-10000px',
          top: '-10000px',
          width: '850px',
          overflow: 'hidden',
          backgroundColor: 'white',
          zIndex: -9999,
          pointerEvents: 'none',
        }}
      >
        <TicketSlip 
          ticket={ticket} 
          onClose={() => {}}
          hideCloseButton={true}
          disableAnimations={true}
        />
      </div>

      {/* Visible Ticket Slip Modal */}
      {showTicketSlip && ticket && (
        <TicketSlip 
          ticket={ticket} 
          onClose={() => setShowTicketSlip(false)} 
          hideCloseButton={false}
        />
      )}

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notification.isOpen}
        title={notification.title}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ ...notification, isOpen: false })}
      />
    </div>
    </>
  );
};

export default Confirmation;
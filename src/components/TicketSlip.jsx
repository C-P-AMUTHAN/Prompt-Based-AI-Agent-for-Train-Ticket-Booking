import React from 'react';
import { motion } from 'framer-motion';
import './TicketSlip.css';

const TicketSlip = ({ ticket, onClose, hideCloseButton, disableAnimations, forPdf }) => {
  if (!ticket) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    if (timeString.includes(':')) return timeString;
    const time = timeString.toString().padStart(4, '0');
    return `${time.slice(0, 2)}:${time.slice(2)}`;
  };

  const bookingDate = new Date(ticket.bookedAt);
  const bookingTime = bookingDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  // For PDF generation, render without overlay but with proper styling
  if (forPdf) {
    return (
      <div className="ticket-slip-content pdf-mode" style={{ width: '800px', margin: '0', background: 'white' }}>
        {/* ========== HEADER SECTION ========== */}
        <div className="ticket-header">
          <h1>Electronic Reservation Slip (ERS)</h1>
          <p>CURRENT BOOKING</p>
          <p>Normal User</p>
        </div>

        {/* ========== JOURNEY DETAILS ROW ========== */}
        <div className="ticket-row">
          <div className="row-content">
            <span className="field-label">Booked From</span>
            <span className="field-value">{ticket.from}</span>
            <span style={{ marginLeft: '40px' }} className="field-label">Start Date*</span>
            <span className="field-value">{formatDate(ticket.date)}</span>
          </div>
        </div>

        {/* ========== TO DETAILS ========== */}
        <div className="ticket-row">
          <div className="row-content">
            <span className="field-label">To</span>
            <span className="field-value">{ticket.to}</span>
            <span style={{ marginLeft: '40px' }} className="field-label">Arrival*</span>
            <span className="field-value">{formatTime(ticket.arrivalTime)}</span>
          </div>
        </div>

        {/* ========== PNR & QUOTA ========== */}
        <div className="ticket-row">
          <div className="row-content">
            <span className="field-label">PNR</span>
            <span className="field-value pnr-number">{ticket.pnr}</span>
            <span style={{ marginLeft: '40px' }} className="field-label">Quota</span>
            <span className="field-value">{ticket.quota || 'GENERAL (GN)'}</span>
          </div>
        </div>

        {/* ========== PASSENGER DETAILS HEADER ========== */}
        <div className="section-divider"></div>
        <h3 className="section-title">Passenger Details</h3>

        {/* ========== BOARDING & TRAIN INFO ========== */}
        <div className="ticket-row">
          <div className="row-content">
            <span className="field-label">Boarding At</span>
            <span className="field-value">{ticket.from}</span>
            <span style={{ marginLeft: '40px' }} className="field-label">Departure*</span>
            <span className="field-value">{formatTime(ticket.departureTime)} {formatDate(ticket.date)}</span>
          </div>
        </div>

        {/* ========== TRAIN & CLASS ========== */}
        <div className="ticket-row">
          <div className="row-content">
            <span className="field-label">Train No./Name</span>
            <span className="field-value">{ticket.trainNumber} / {ticket.trainName}</span>
            <span style={{ marginLeft: '20px' }} className="field-label">Distance</span>
            <span className="field-value">{ticket.distance} KM</span>
          </div>
        </div>

        {/* ========== CLASS & BOOKING DATE ========== */}
        <div className="ticket-row">
          <div className="row-content">
            <span className="field-label">Class</span>
            <span className="field-value">{ticket.travelClass}</span>
            <span style={{ marginLeft: '40px' }} className="field-label">Booking Date</span>
            <span className="field-value">{formatDate(ticket.bookedAt)}</span>
          </div>
        </div>

        {/* ========== PASSENGER TABLE ========== */}
        <div className="section-divider"></div>
        <table className="passenger-details-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Age</th>
              <th>Gender</th>
              <th>Booking Status</th>
              <th>Current Status</th>
            </tr>
          </thead>
          <tbody>
            {ticket.passengers && ticket.passengers.map((passenger, idx) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td>{passenger.name}</td>
                <td>{passenger.age}</td>
                <td>{passenger.gender}</td>
                <td>{ticket.bookingStatus || 'CONFIRMED'}</td>
                <td>Coach: N/A, Seat: N/A</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ========== ACRONYMS ========== */}
        <div className="acronyms-section">
          <p className="acronym-text">
            POWL: POOLED QUOTA WAITLIST    RSWL: ROAD-SIDE WAITLIST    RLWL: REMOTE LOCATION WAITLIST
          </p>
        </div>

        {/* ========== TRANSACTION ID & NOTE ========== */}
        <div className="transaction-note">
          <p>Transaction ID: {ticket.transactionId || 'N/A'}    IR recovers only 57% of cost of travel on an average.</p>
        </div>

        {/* ========== PAYMENT DETAILS ========== */}
        <div className="section-divider"></div>
        <h3 className="section-title">Payment Details</h3>

        <div className="payment-row">
          <span className="payment-label">Ticket Fare</span>
          <span className="payment-value">₹ {(ticket.totalCost - (ticket.convenienceFee || 15)).toFixed(2)}</span>
        </div>

        <div className="payment-row">
          <span className="payment-label">IRCTC Convenience Fee (Incl. of GST)</span>
          <span className="payment-value">₹ {(ticket.convenienceFee || 15).toFixed(2)}</span>
        </div>

        <div className="payment-row">
          <span className="payment-label">Total Fare (all inclusive)</span>
          <span className="payment-value">₹ {(ticket.totalCost || 0).toFixed(2)}</span>
        </div>

        <div className="payment-row">
          <span className="payment-label">PG Charges as applicable (Additional)</span>
          <span className="payment-value">₹ {(ticket.pgCharges || 0).toFixed(2)}</span>
        </div>

        {/* ========== IMPORTANT NOTES ========== */}
        <div className="section-divider"></div>
        <div className="important-notes">
          <p>⚫ Beware of fraudulent customer care number. For any assistance, use only the IRCTC e-ticketing Customer care number:14646.</p>
          <p>⚫ IRCTC Convenience Fee is charged per e-ticket irrespective of number of passengers on the ticket.</p>
          <p>⚫ The printed Departure and Arrival Times are liable to change. Please Check correct departure, arrival from Railway Station Enquiry or Dial 139 or SMS RAIL to 139.</p>
          <p>⚫ This ticket is booked on a personal User ID, its sale/purchase is an offence u/s 143 of the Railways Act, 1989.</p>
          <p>⚫ Prescribed original ID proof is required while travelling along with SMS/VRM/ERS otherwise will be treated as without ticket and penalized as per Railway Rules.</p>
          <p>⚫ Amount Deducted? Ticket Not Booked? No Worries! Reuse the deducted amount for your next booking with IRCTC iPay</p>
        </div>

        {/* ========== GST DETAILS ========== */}
        <div className="section-divider"></div>
        <h3 className="section-title">Indian Railways GST Details</h3>

        <div className="gst-info">
          <p>Invoice Number: {ticket.invoiceNumber || `PS24${ticket.pnr.slice(-11)}`}    Address: Indian Railways New Delhi</p>
          <p>Supplier Information:    SAC Code: 996421    GSTIN: {ticket.gstin || '07AAAGM0289C1ZL'}</p>
          <p>Recipient Information:    GSTIN: NA    Name: NA    Address: NA</p>
        </div>

        {/* ========== FOOTER ========== */}
        <div className="ticket-footer">
          <p>This is an electronically generated receipt. No signature required.</p>
          <p>For more details, visit www.irctc.co.in or call 139</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ticket-slip-overlay">
      <motion.div
        className="ticket-slip-container"
        initial={disableAnimations ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={disableAnimations ? { duration: 0 } : { duration: 0.3 }}
      >
        {/* Close Button */}
        {!hideCloseButton && onClose && (
          <button onClick={onClose} className="ticket-close-btn">✕</button>
        )}

        {/* Printable Ticket */}
        <div className="ticket-slip-content">
          {/* ========== HEADER SECTION ========== */}
          <div className="ticket-header">
            <h1>Electronic Reservation Slip (ERS)</h1>
            <p>CURRENT BOOKING</p>
            <p>Normal User</p>
          </div>

          {/* ========== JOURNEY DETAILS ROW ========== */}
          <div className="ticket-row">
            <div className="row-content">
              <span className="field-label">Booked From</span>
              <span className="field-value">{ticket.from}</span>
              <span style={{ marginLeft: '40px' }} className="field-label">Start Date*</span>
              <span className="field-value">{formatDate(ticket.date)}</span>
            </div>
          </div>

          {/* ========== TO DETAILS ========== */}
          <div className="ticket-row">
            <div className="row-content">
              <span className="field-label">To</span>
              <span className="field-value">{ticket.to}</span>
              <span style={{ marginLeft: '40px' }} className="field-label">Arrival*</span>
              <span className="field-value">{formatTime(ticket.arrivalTime)}</span>
            </div>
          </div>

          {/* ========== PNR & QUOTA ========== */}
          <div className="ticket-row">
            <div className="row-content">
              <span className="field-label">PNR</span>
              <span className="field-value pnr-number">{ticket.pnr}</span>
              <span style={{ marginLeft: '40px' }} className="field-label">Quota</span>
              <span className="field-value">{ticket.quota || 'GENERAL (GN)'}</span>
            </div>
          </div>

          {/* ========== PASSENGER DETAILS HEADER ========== */}
          <div className="section-divider"></div>
          <h3 className="section-title">Passenger Details</h3>

          {/* ========== BOARDING & TRAIN INFO ========== */}
          <div className="ticket-row">
            <div className="row-content">
              <span className="field-label">Boarding At</span>
              <span className="field-value">{ticket.from}</span>
              <span style={{ marginLeft: '40px' }} className="field-label">Departure*</span>
              <span className="field-value">{formatTime(ticket.departureTime)} {formatDate(ticket.date)}</span>
            </div>
          </div>

          {/* ========== TRAIN & CLASS ========== */}
          <div className="ticket-row">
            <div className="row-content">
              <span className="field-label">Train No./Name</span>
              <span className="field-value">{ticket.trainNumber} / {ticket.trainName}</span>
              <span style={{ marginLeft: '20px' }} className="field-label">Distance</span>
              <span className="field-value">{ticket.distance} KM</span>
            </div>
          </div>

          {/* ========== CLASS & BOOKING DATE ========== */}
          <div className="ticket-row">
            <div className="row-content">
              <span className="field-label">Class</span>
              <span className="field-value">{ticket.travelClass}</span>
              <span style={{ marginLeft: '40px' }} className="field-label">Booking Date</span>
              <span className="field-value">{formatDate(ticket.bookedAt)}</span>
            </div>
          </div>

          {/* ========== PASSENGER TABLE ========== */}
          <div className="section-divider"></div>
          <table className="passenger-details-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Booking Status</th>
                <th>Current Status</th>
              </tr>
            </thead>
            <tbody>
              {ticket.passengers && ticket.passengers.map((passenger, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{passenger.name}</td>
                  <td>{passenger.age}</td>
                  <td>{passenger.gender}</td>
                  <td>{ticket.bookingStatus || 'CONFIRMED'}</td>
                  <td>Coach: N/A, Seat: N/A</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ========== ACRONYMS ========== */}
          <div className="acronyms-section">
            <p className="acronym-text">
              POWL: POOLED QUOTA WAITLIST    RSWL: ROAD-SIDE WAITLIST    RLWL: REMOTE LOCATION WAITLIST
            </p>
          </div>

          {/* ========== TRANSACTION ID & NOTE ========== */}
          <div className="transaction-note">
            <p>Transaction ID: {ticket.transactionId || 'N/A'}    IR recovers only 57% of cost of travel on an average.</p>
          </div>

          {/* ========== PAYMENT DETAILS ========== */}
          <div className="section-divider"></div>
          <h3 className="section-title">Payment Details</h3>

          <div className="payment-row">
            <span className="payment-label">Ticket Fare</span>
            <span className="payment-value">₹ {(ticket.totalCost - (ticket.convenienceFee || 15)).toFixed(2)}</span>
          </div>

          <div className="payment-row">
            <span className="payment-label">IRCTC Convenience Fee (Incl. of GST)</span>
            <span className="payment-value">₹ {(ticket.convenienceFee || 15).toFixed(2)}</span>
          </div>

          <div className="payment-row">
            <span className="payment-label">Total Fare (all inclusive)</span>
            <span className="payment-value">₹ {(ticket.totalCost || 0).toFixed(2)}</span>
          </div>

          <div className="payment-row">
            <span className="payment-label">PG Charges as applicable (Additional)</span>
            <span className="payment-value">₹ {(ticket.pgCharges || 0).toFixed(2)}</span>
          </div>

          {/* ========== IMPORTANT NOTES ========== */}
          <div className="section-divider"></div>
          <div className="important-notes">
            <p>⚫ Beware of fraudulent customer care number. For any assistance, use only the IRCTC e-ticketing Customer care number:14646.</p>
            <p>⚫ IRCTC Convenience Fee is charged per e-ticket irrespective of number of passengers on the ticket.</p>
            <p>⚫ The printed Departure and Arrival Times are liable to change. Please Check correct departure, arrival from Railway Station Enquiry or Dial 139 or SMS RAIL to 139.</p>
            <p>⚫ This ticket is booked on a personal User ID, its sale/purchase is an offence u/s 143 of the Railways Act, 1989.</p>
            <p>⚫ Prescribed original ID proof is required while travelling along with SMS/VRM/ERS otherwise will be treated as without ticket and penalized as per Railway Rules.</p>
            <p>⚫ Amount Deducted? Ticket Not Booked? No Worries! Reuse the deducted amount for your next booking with IRCTC iPay</p>
          </div>

          {/* ========== GST DETAILS ========== */}
          <div className="section-divider"></div>
          <h3 className="section-title">Indian Railways GST Details</h3>

          <div className="gst-info">
            <p>Invoice Number: {ticket.invoiceNumber || `PS24${ticket.pnr.slice(-11)}`}    Address: Indian Railways New Delhi</p>
            <p>Supplier Information:    SAC Code: 996421    GSTIN: {ticket.gstin || '07AAAGM0289C1ZL'}</p>
            <p>Recipient Information:    GSTIN: NA    Name: NA    Address: NA</p>
          </div>

          {/* ========== FOOTER ========== */}
          <div className="ticket-footer">
            <p>This is an electronically generated receipt. No signature required.</p>
            <p>For more details, visit www.irctc.co.in or call 139</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="ticket-actions">
          <button onClick={() => window.print()} className="btn btn-primary">
            🖨️ Print Ticket
          </button>
          {onClose && (
            <button onClick={onClose} className="btn btn-secondary">
              Close
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default TicketSlip;

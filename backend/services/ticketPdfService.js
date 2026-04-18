const PDFDocument = require('pdfkit');
const { Readable } = require('stream');

// Generate professional Indian Railways ERS PDF
const generateErsTicketPDF = (ticket) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 25,
        bufferPages: true 
      });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Helper functions
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

      const addSection = (title) => {
        doc.fontSize(11).font('Helvetica-Bold');
        doc.text(title, { underline: true });
        doc.moveDown(0.3);
      };

      const addField = (label, value) => {
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text(label, { continued: true });
        doc.font('Helvetica');
        doc.text(': ' + value);
      };

      const pageHeight = doc.page.height;
      const pageWidth = doc.page.width;
      const margin = 25;
      const contentWidth = pageWidth - (2 * margin);

      // ==================== HEADER ====================
      doc.fontSize(16).font('Helvetica-Bold');
      doc.text('ELECTRONIC RESERVATION SLIP (ERS)', { align: 'center' });
      
      doc.fontSize(10).font('Helvetica');
      doc.text('CURRENT BOOKING | User Type: Normal User', { align: 'center' });
      
      doc.fontSize(9).text('🚂 INDIAN RAILWAYS', { align: 'center' });
      doc.moveDown(0.5);

      // Header line
      doc.lineWidth(1.5).moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke();
      doc.moveDown(0.3);

      // ==================== JOURNEY DETAILS ====================
      addSection('JOURNEY DETAILS');
      
      const journeyData = [
        ['FROM', ticket.from || 'N/A'],
        ['TO', ticket.to || 'N/A'],
        ['JOURNEY DATE', formatDate(ticket.date)],
        ['DEPARTURE', formatTime(ticket.departureTime)],
        ['ARRIVAL', formatTime(ticket.arrivalTime)],
        ['DISTANCE', (ticket.distance || 'N/A') + ' km']
      ];

      journeyData.forEach(([label, value]) => {
        addField(label, value);
      });

      doc.fontSize(8).font('Helvetica-Bold').fillColor('#dc2626');
      doc.text('⚠️  FOOD CHARGES NOT INCLUDED');
      doc.fillColor('#000000');
      doc.moveDown(0.4);

      // ==================== TRAIN & TICKET INFO ====================
      addSection('TRAIN & TICKET INFORMATION');
      
      const trainData = [
        ['PNR NUMBER', ticket.pnr || 'N/A'],
        ['TRAIN NUMBER', ticket.trainNumber || 'N/A'],
        ['TRAIN NAME', ticket.trainName || 'N/A'],
        ['CLASS', ticket.travelClass || 'N/A'],
        ['QUOTA', ticket.quota || 'GENERAL (GN)'],
        ['BOOKING STATUS', ticket.bookingStatus || 'CONFIRMED']
      ];

      trainData.forEach(([label, value]) => {
        addField(label, value);
      });
      doc.moveDown(0.4);

      // ==================== BOOKING INFORMATION ====================
      addSection('BOOKING INFORMATION');
      
      const bookingDate = new Date(ticket.bookedAt);
      const bookingTime = bookingDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      
      const bookingData = [
        ['BOOKING DATE', formatDate(ticket.bookedAt)],
        ['BOOKING TIME', bookingTime],
        ['TRANSACTION ID', ticket.transactionId || 'N/A']
      ];

      bookingData.forEach(([label, value]) => {
        addField(label, value);
      });
      doc.moveDown(0.4);

      // ==================== PASSENGER DETAILS ====================
      addSection('PASSENGER DETAILS');
      
      // Table header
      const tableTop = doc.y;
      const col1 = margin;
      const col2 = col1 + 30;
      const col3 = col2 + 120;
      const col4 = col3 + 40;
      const col5 = col4 + 40;
      const col6 = col5 + 60;

      doc.fontSize(8).font('Helvetica-Bold').fillColor('#fff').fillAndStroke('#000');
      doc.rect(col1, tableTop, col2 - col1 - 2, 15).fill();
      doc.rect(col2, tableTop, col3 - col2 - 2, 15).fill();
      doc.rect(col3, tableTop, col4 - col3 - 2, 15).fill();
      doc.rect(col4, tableTop, col5 - col4 - 2, 15).fill();
      doc.rect(col5, tableTop, col6 - col5 - 2, 15).fill();
      doc.rect(col6, tableTop, pageWidth - margin - col6, 15).fill();

      doc.fillColor('#fff');
      doc.text('SL', col1 + 2, tableTop + 3, { width: col2 - col1 - 4, align: 'center' });
      doc.text('NAME', col2 + 2, tableTop + 3, { width: col3 - col2 - 4, align: 'center' });
      doc.text('AGE', col3 + 2, tableTop + 3, { width: col4 - col3 - 4, align: 'center' });
      doc.text('GENDER', col4 + 2, tableTop + 3, { width: col5 - col4 - 4, align: 'center' });
      doc.text('B.STATUS', col5 + 2, tableTop + 3, { width: col6 - col5 - 4, align: 'center' });
      doc.text('C.STATUS', col6 + 2, tableTop + 3, { align: 'left' });

      doc.moveDown(1.2);
      doc.fillColor('#000');

      // Table rows
      if (ticket.passengers && ticket.passengers.length > 0) {
        ticket.passengers.forEach((passenger, idx) => {
          const rowTop = doc.y;
          
          doc.fontSize(8).font('Helvetica');
          doc.rect(col1, rowTop, col2 - col1 - 2, 14).stroke();
          doc.rect(col2, rowTop, col3 - col2 - 2, 14).stroke();
          doc.rect(col3, rowTop, col4 - col3 - 2, 14).stroke();
          doc.rect(col4, rowTop, col5 - col4 - 2, 14).stroke();
          doc.rect(col5, rowTop, col6 - col5 - 2, 14).stroke();
          doc.rect(col6, rowTop, pageWidth - margin - col6, 14).stroke();

          doc.text((idx + 1).toString(), col1 + 2, rowTop + 2, { width: col2 - col1 - 4, align: 'center' });
          doc.text(passenger.name || 'N/A', col2 + 2, rowTop + 2, { width: col3 - col2 - 4 });
          doc.text(passenger.age || 'N/A', col3 + 2, rowTop + 2, { width: col4 - col3 - 4, align: 'center' });
          doc.text(passenger.gender || 'N/A', col4 + 2, rowTop + 2, { width: col5 - col4 - 4, align: 'center' });
          doc.text(ticket.bookingStatus || 'CONFIRMED', col5 + 2, rowTop + 2, { width: col6 - col5 - 4, align: 'center' });
          doc.text('Coach: -, Seat: -', col6 + 2, rowTop + 2, { width: pageWidth - margin - col6 - 4, fontSize: 7 });

          doc.moveDown(1);
        });
      }

      doc.moveDown(0.3);

      // ==================== FARE DETAILS ====================
      addSection('FARE DETAILS');
      
      const baseFare = (ticket.totalCost || 0) - (ticket.convenienceFee || 15);
      const totalTax = (ticket.totalCost || 0) * 0.05;
      
      const fareData = [
        ['Base Fare', '₹' + baseFare.toFixed(2)],
        ['Convenience Fee (incl. GST)', '₹' + (ticket.convenienceFee || 15).toFixed(2)],
        ['PG Charges', '₹' + (ticket.pgCharges || 0).toFixed(2)],
        ['TOTAL FARE (All Inclusive)', '₹' + (ticket.totalCost || 0).toFixed(2)]
      ];

      fareData.forEach(([label, value]) => {
        if (label === 'TOTAL FARE (All Inclusive)') {
          doc.fontSize(9).font('Helvetica-Bold').fillColor('#dc2626');
          doc.text(label + ': ' + value);
          doc.fillColor('#000');
        } else {
          addField(label, value);
        }
      });
      doc.moveDown(0.4);

      // ==================== GST & INVOICE ====================
      addSection('GST & INVOICE DETAILS');
      
      const gstData = [
        ['INVOICE NUMBER', ticket.invoiceNumber || 'N/A'],
        ['SAC CODE', '996421'],
        ['GSTIN', ticket.gstin || '07AAAGM0289C1ZL'],
        ['Taxable Value', '₹' + (baseFare).toFixed(2)],
        ['CGST (2.5%)', '₹' + (totalTax / 2).toFixed(2)],
        ['SGST (2.5%)', '₹' + (totalTax / 2).toFixed(2)],
        ['Total Tax', '₹' + totalTax.toFixed(2)]
      ];

      gstData.forEach(([label, value]) => {
        addField(label, value);
      });
      doc.moveDown(0.4);

      // ==================== LEGAL NOTICES ====================
      addSection('LEGAL NOTICES & SECURITY');
      
      doc.fontSize(8).font('Helvetica-Bold');
      doc.text('⚠️  FRAUD WARNING:');
      doc.font('Helvetica');
      doc.text('Beware of fraudulent bookings. For grievances, call IRCTC Customer Care: 139', { width: contentWidth });
      
      doc.moveDown(0.2);
      doc.font('Helvetica-Bold');
      doc.text('TICKET RESALE NOTICE:');
      doc.font('Helvetica');
      doc.text('Resale of railway tickets is strictly prohibited and is a punishable offense.', { width: contentWidth });

      doc.moveDown(0.2);
      doc.font('Helvetica-Bold');
      doc.text('MANDATORY ID PROOF:');
      doc.font('Helvetica');
      doc.text('Valid ID proof is mandatory during travel.', { width: contentWidth });
      doc.moveDown(0.4);

      // ==================== FOOTER ====================
      doc.fontSize(7).font('Helvetica');
      doc.text('This is an electronically generated receipt. No signature required.', { align: 'center' });
      doc.text('For more details, visit www.irctc.co.in or call 139', { align: 'center' });

      // Footer line
      doc.moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke();

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateErsTicketPDF
};

import React, { useState, useRef, useEffect } from "react";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import BackButton from '../components/BackButton';

export default function PromptBooking() {
  const [prompt, setPrompt] = useState("");
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({ progress: 0, message: "" });
  const [isListening, setIsListening] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [pdfData, setPdfData] = useState(null);
  const eventSourceRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US";
      setVoiceAvailable(true);

      // Handle recognized speech
      recognitionRef.current.onresult = (event) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " ";
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setPrompt((prev) => prev + finalTranscript);
        }
      };

      // Handle voice recognition end
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      // Handle errors
      recognitionRef.current.onerror = (event) => {
        setIsListening(false);
        console.error("Speech recognition error:", event.error);
        if (event.error !== "no-speech") {
          setError(`Voice error: ${event.error}`);
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const handleVoiceInput = () => {
    if (!voiceAvailable) {
      setError("Voice input is not supported in your browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setError("");
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setTicket(null);
    setPdfData(null);
    setLoading(true);
    setProgress({ progress: 0, message: "" });

    try {
      const API_BASE = import.meta.env.VITE_API_BASE || "https://railway-backend-uehg.onrender.com";
      const url = `${API_BASE.replace(/\/+$/,'')}/api/prompt/book`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Server returned ${res.status}${txt ? `: ${txt}` : ""}`);
      }

      const json = await res.json();

      // Handle payment required response
      if (json.status === "PAYMENT_REQUIRED") {
        setLoading(false);
        await handlePayment(json);
        return;
      }

      // Handle booking ready (non-auto-pay)
      if (json.status === "BOOKING_READY") {
        setTicket(json);
        setLoading(false);
        return;
      }

      // Legacy response handling
      if (json && json.bookingDetails) {
        setTicket(json.bookingDetails);
      } else {
        setTicket(json);
      }

      // open pdf in new tab if available
      if (json && json.pdfPath) {
        const pdfUrl = json.pdfPath.startsWith("http") ? json.pdfPath : `${API_BASE.replace(/\/+$/,'')}${json.pdfPath}`;
        window.open(pdfUrl, "_blank");
      }
    } catch (err) {
      console.error("Prompt booking error:", err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (paymentData) => {
    try {
      // Load Razorpay SDK dynamically
      if (!window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_your_key_here', // Add to env
        amount: paymentData.order.amount,
        currency: paymentData.order.currency,
        order_id: paymentData.order.id,
        name: 'Railway Ticket Booking',
        description: `Booking for ${paymentData.bookingDetails.source_station} to ${paymentData.bookingDetails.destination_station}`,
        handler: async (response) => {
          // Payment successful, verify on backend
          await verifyPayment(response, paymentData);
        },
        prefill: {
          email: paymentData.bookingDetails.passengers[0]?.email || '',
          contact: paymentData.bookingDetails.passengers[0]?.phone || ''
        },
        theme: {
          color: '#4f46e5'
        },
        modal: {
          ondismiss: () => {
            setError("Payment was cancelled. Please try again.");
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Payment initialization error:", err);
      setError("Failed to initialize payment. Please try again.");
    }
  };

  const verifyPayment = async (razorpayResponse, paymentData) => {
    try {
      setLoading(true);
      setError("");

      const API_BASE = import.meta.env.VITE_API_BASE || "https://railway-backend-uehg.onrender.com";
      const verifyResponse = await fetch(`${API_BASE}/api/payment/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: razorpayResponse.razorpay_order_id,
          razorpay_payment_id: razorpayResponse.razorpay_payment_id,
          razorpay_signature: razorpayResponse.razorpay_signature,
          bookingData: {
            ...paymentData.bookingDetails,
            trainId: paymentData.train._id,
            trainName: paymentData.train.name,
            trainNumber: paymentData.train.number,
            departureTime: paymentData.train.departureTime,
            arrivalTime: paymentData.train.arrivalTime,
            travelClass: paymentData.bookingDetails.class,
            distance: paymentData.distance || 480, // Use from paymentData or default
            totalCost: paymentData.totalCost
          }
        })
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Payment verification failed: ${verifyResponse.status}`);
      }

      const result = await verifyResponse.json();

      // Show success and ticket details
      const ticketData = {
        status: "SUCCESS",
        ticket_id: result.ticketId || result._id,
        train: `${paymentData.train.number} / ${paymentData.train.name}`,
        trainNumber: paymentData.train.number,
        trainName: paymentData.train.name,
        journey: `${paymentData.bookingDetails.source_station} to ${paymentData.bookingDetails.destination_station}`,
        class: paymentData.bookingDetails.class,
        travelClass: paymentData.bookingDetails.class,
        passengers: paymentData.bookingDetails.passengers,
        payment_status: "CONFIRMED",
        message: "Booking completed successfully!",
        pnr: result.ticket?.pnr || result.pnr,
        from: paymentData.bookingDetails.source_station,
        to: paymentData.bookingDetails.destination_station,
        date: paymentData.bookingDetails.travel_date,
        departureTime: paymentData.train.departureTime,
        arrivalTime: paymentData.train.arrivalTime,
        distance: paymentData.distance || 480, // Use from paymentData or default
        totalCost: paymentData.totalCost,
        email: paymentData.bookingDetails.passengers[0]?.email || '',
        bookedAt: new Date().toISOString()
      };

      setTicket(ticketData);

      // Generate and upload PDF
      setTimeout(() => {
        generateAndUploadPdf(ticketData);
      }, 1000); // Small delay to ensure DOM is updated

    } catch (err) {
      console.error("Payment verification error:", err);
      setError(err.message || "Payment verification failed. Please contact support.");
    } finally {
      setLoading(false);
    }
  };

  const generateAndUploadPdf = async (ticketData) => {
    try {
      setUploadingPdf(true);
      console.log('📄 Generating PDF for ticket:', ticketData.pnr);

      // Create a temporary container for PDF generation
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '800px';
      tempContainer.style.height = 'auto';
      tempContainer.style.backgroundColor = 'white';
      tempContainer.style.zIndex = '9999';
      tempContainer.style.overflow = 'visible';
      document.body.appendChild(tempContainer);

      // Create a React root to render the TicketSlip component
      const reactRoot = document.createElement('div');
      tempContainer.appendChild(reactRoot);

      // Import ReactDOM dynamically
      const { createRoot } = await import('react-dom/client');
      const root = createRoot(reactRoot);

      // Render the TicketSlip component
      const { default: TicketSlip } = await import('./../components/TicketSlip');
      
      await new Promise((resolve) => {
        root.render(
          <TicketSlip 
            ticket={ticketData} 
            hideCloseButton={true} 
            disableAnimations={true} 
            forPdf={true}
          />
        );
        
        // Wait for rendering
        setTimeout(resolve, 2000);
      });

      // Ensure the component has rendered and has dimensions
      const ticketElement = tempContainer.querySelector('.ticket-slip-content') || tempContainer;
      if (!ticketElement || ticketElement.offsetWidth === 0 || ticketElement.offsetHeight === 0) {
        console.error('Ticket element not rendered properly');
        document.body.removeChild(tempContainer);
        return;
      }

      console.log('Ticket element dimensions:', ticketElement.offsetWidth, 'x', ticketElement.offsetHeight);

      // Capture the element with html2canvas
      console.log('📸 Capturing ticket element with html2canvas...');
      const canvas = await html2canvas(ticketElement, {
        allowTaint: true,
        useCORS: true,
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        imageTimeout: 5000,
        timeout: 10000,
        width: ticketElement.offsetWidth,
        height: ticketElement.offsetHeight
      });

      // Clean up React root and container
      root.unmount();
      document.body.removeChild(tempContainer);

      console.log('✅ Canvas created:', { width: canvas.width, height: canvas.height });

      // Convert canvas to image data
      const imgData = canvas.toDataURL('image/png');
      
      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      console.log('📄 Creating PDF with dimensions:', { imgWidth, pageHeight, imgHeight });

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

      // Convert PDF to Base64
      const pdfBase64 = pdf.output('dataurlstring').split(',')[1];
      setPdfData(pdf.output('dataurlstring'));
      console.log('✅ PDF Base64 generated, size:', pdfBase64.length);

      // Upload PDF to backend
      console.log('📤 Uploading PDF to backend...');
      const API_BASE = import.meta.env.VITE_API_BASE || "https://railway-backend-uehg.onrender.com";
      const uploadResponse = await fetch(`${API_BASE}/api/payment/upload-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pnr: ticketData.pnr,
          email: ticketData.email,
          pdfBase64: pdfBase64
        })
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'PDF upload failed');
      }

      const uploadResult = await uploadResponse.json();
      console.log('✅ PDF uploaded:', uploadResult);
      
      setPdfGenerated(true);
      setUploadingPdf(false);

      // Show appropriate message based on email sending status
      if (uploadResult.emailSent === false) {
        console.log('ℹ️ PDF uploaded but no email sent (no email provided)');
      } else {
        console.log('✅ PDF uploaded and email sent');
      }
    } catch (err) {
      console.error('PDF generation/upload error:', err);
      setUploadingPdf(false);
      // Don't show error for PDF issues, as the booking is already successful
    }
  };

  const downloadPdf = () => {
    if (!pdfData || !ticket?.pnr) return;

    const base64 = pdfData.split(',')[1];
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ticket_${ticket.pnr}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom right, #dbeafe, #e0e7ff, #f3e8ff)",
        padding: 24,
        color: "#111827",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 920,
          margin: "0 auto",
          background: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(12px)",
          padding: 32,
          borderRadius: 16,
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
        }}
      >
        <h1 style={{
          marginTop: 0,
          marginBottom: 8,
          fontSize: "2.25rem",
          fontWeight: 700,
          color: "#1f2937",
          textAlign: "center"
        }}>🤖 AI Prompt Booking</h1>
        <div style={{
          textAlign: "center",
          color: "#4b5563",
          fontSize: "1.125rem",
          marginBottom: 32,
          lineHeight: 1.6
        }}>
          <p style={{ marginBottom: 12, marginTop: 0 }}>
            Describe your travel needs in natural language and let AI handle the booking for you!<br/>
            <small style={{ color: "#6b7280", fontSize: "0.875rem" }}>
              Example: "Book 2 AC 3-Tier tickets from Chennai to Trichy on 2025-01-15. Passengers: P2, 25, Male; P2, 23, Female. Contact: 9876543210, amuthan@example.com"
            </small>
          </p>
          {voiceAvailable && (
            <div style={{ marginTop: "12px", color: "#10b981", fontSize: "0.875rem" }}>
              ✓ Voice input is available in your browser
            </div>
          )}
        </div>
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}
        >
          <input
            id="sourceStation"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: Book 2 sleeper tickets from Chennai to Trichy on 2025-10-10 for Amuthan"
            style={{
              flex: 1,
              padding: 16,
              borderRadius: 12,
              border: "1px solid #d1d5db",
              fontSize: "1rem",
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              transition: "all 0.3s ease",
              outline: "none",
              fontFamily: "inherit",
              minWidth: "250px"
            }}
            onFocus={(e) => e.target.style.borderColor = "#4f46e5"}
            onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
          />
          {voiceAvailable && (
            <button
              type="button"
              onClick={handleVoiceInput}
              style={{
                padding: "16px 24px",
                borderRadius: "9999px",
                backgroundColor: isListening ? "#ef4444" : "#10b981",
                color: "white",
                fontWeight: 600,
                fontSize: "1rem",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                transition: "all 0.3s ease",
                minWidth: "140px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: isListening ? "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite" : "none"
              }}
              onMouseEnter={(e) => !isListening && (e.target.style.backgroundColor = "#059669")}
              onMouseLeave={(e) => !isListening && (e.target.style.backgroundColor = "#10b981")}
              title="Click to start/stop voice input"
            >
              {isListening ? "🎤 Listening..." : "🎤 Voice Input"}
            </button>
          )}
          {prompt && (
            <button
              type="button"
              onClick={() => setPrompt("")}
              style={{
                padding: "16px 24px",
                borderRadius: "9999px",
                backgroundColor: "#f3f4f6",
                color: "#6b7280",
                fontWeight: 600,
                fontSize: "1rem",
                border: "1px solid #d1d5db",
                cursor: "pointer",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)",
                transition: "all 0.3s ease",
                minWidth: "100px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = "#e5e7eb"}
              onMouseLeave={(e) => e.target.style.backgroundColor = "#f3f4f6"}
              title="Clear the prompt text"
            >
              🗑️ Clear
            </button>
          )}
          <button
            style={{
              padding: "16px 24px",
              borderRadius: "9999px",
              backgroundColor: "#4f46e5",
              color: "white",
              fontWeight: 600,
              fontSize: "1rem",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
              transition: "all 0.3s ease",
              minWidth: "140px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#4338ca"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "#4f46e5"}
          >
            {loading ? "🔄 Booking..." : "🚀 Book Ticket"}
          </button>
        </form>
        {loading && (
          <div style={{
            color: "#4f46e5",
            marginTop: "24px",
            padding: "16px",
            backgroundColor: "rgba(79, 70, 229, 0.05)",
            border: "1px solid rgba(79, 70, 229, 0.2)",
            borderRadius: "8px",
            fontSize: "1rem",
            fontWeight: "500",
            textAlign: "center"
          }}>
            🤖 AI is automating your booking... This may take 30-60 seconds
            <br/>
            <small style={{ color: "#6b7280", fontSize: "0.875rem" }}>
              {progress.message || "Step 1: Signing in → Step 2: Filling form → Step 3: Booking ticket"}
            </small>
            {progress.progress > 0 && (
              <div style={{
                marginTop: "12px",
                width: "100%",
                height: "8px",
                backgroundColor: "rgba(79, 70, 229, 0.1)",
                borderRadius: "4px",
                overflow: "hidden"
              }}>
                <div style={{
                  width: `${progress.progress}%`,
                  height: "100%",
                  backgroundColor: "#4f46e5",
                  transition: "width 0.3s ease"
                }}></div>
              </div>
            )}
          </div>
        )}
        {error && (
          <div style={{
            color: "#dc2626",
            marginTop: "24px",
            padding: "16px",
            backgroundColor: "rgba(254, 226, 226, 0.8)",
            border: "1px solid rgba(220, 38, 38, 0.2)",
            borderRadius: "8px",
            fontSize: "1rem",
            fontWeight: "500"
          }}>❌ {error}</div>
        )}
        {ticket && (
          <div className="result-area">
            {ticket.status === "SUCCESS" ? (
              <div className="success-result-card" style={{ marginTop: 20, padding: 20, backgroundColor: "#f0f9ff", border: "1px solid #0ea5e9", borderRadius: 8 }}>
                <h3 style={{ margin: 0, color: "#0ea5e9" }}>🎉 Booking Successful!</h3>
                <p style={{ marginTop: 8, marginBottom: 12 }}>{ticket.message}</p>
                <div style={{ backgroundColor: "white", padding: 16, borderRadius: 8, marginTop: 16 }}>
                  <h4>Ticket Details</h4>
                  <p><strong>PNR:</strong> {ticket.pnr}</p>
                  <p><strong>Train:</strong> {ticket.train}</p>
                  <p><strong>Journey:</strong> {ticket.journey}</p>
                  <p><strong>Class:</strong> {ticket.class}</p>
                  <p><strong>Payment Status:</strong> {ticket.payment_status}</p>
                  <h5>Passengers:</h5>
                  <ul>
                    {ticket.passengers.map((passenger, index) => (
                      <li key={index}>
                        {passenger.name} - Age: {passenger.age} - Gender: {passenger.gender}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* PDF Status and Download */}
                <div style={{ marginTop: 16, padding: 12, backgroundColor: "#f8fafc", borderRadius: 6 }}>
                  {uploadingPdf ? (
                    <p style={{ margin: 0, color: "#64748b" }}>📄 Generating and sending ticket PDF...</p>
                  ) : pdfGenerated ? (
                    <div>
                      <p style={{ margin: 0, color: "#059669", fontWeight: "bold" }}>✅ Ticket PDF generated successfully!</p>
                      <p style={{ margin: "8px 0 0 0", fontSize: "14px", color: "#64748b" }}>
                        {ticket.email ? "📧 Confirmation email sent to your email address." : "💡 No email provided - PDF generated locally."}
                      </p>
                      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                        <button
                          onClick={downloadPdf}
                          style={{
                            padding: '8px 16px',
                            background: '#6b46ff',
                            color: 'white',
                            borderRadius: 6,
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                          title="Download ticket PDF"
                        >
                          ⬇️ Download Ticket
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p style={{ margin: 0, color: "#64748b" }}>📄 Generating ticket PDF...</p>
                  )}
                </div>
              </div>
            ) : ticket.pdfPath ? (
              <div className="pdf-result-card" style={{ marginTop: 20 }}>
                <h3 style={{ margin: 0 }}>🎉 Ticket Ready</h3>
                <p style={{ marginTop: 8, marginBottom: 12 }}>Your ticket PDF is ready — preview below or download.</p>
                <div style={{ width: '100%', height: 600, border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
                  <iframe
                    title="Ticket PDF"
                    src={ticket.pdfPath}
                    style={{ width: '100%', height: '100%', border: 0 }}
                  />
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <a
                    className="download-btn"
                    href={ticket.pdfPath}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      padding: '10px 16px',
                      background: '#6b46ff',
                      color: 'white',
                      borderRadius: 8,
                      textDecoration: 'none'
                    }}
                  >
                    ⬇️ Download Ticket PDF
                  </a>
                  <button
                    onClick={() => window.open(ticket.pdfPath, '_blank', 'noopener')}
                    style={{
                      padding: '10px 16px',
                      borderRadius: 8,
                      border: '1px solid #ddd',
                      background: '#fff'
                    }}
                  >
                    🔍 Open in new tab
                  </button>
                </div>
              </div>
            ) : (
              // when no pdf yet, keep previous empty state / feedback area
              <div style={{ marginTop: 20 }}>
                {loading ? <p>Processing... please wait.</p> : <p>No ticket yet.</p>}
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
      <BackButton to="/" label="← Back to Home" />
    </div>
  );
}

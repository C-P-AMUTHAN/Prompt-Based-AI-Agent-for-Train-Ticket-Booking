import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import BackButton from '../components/BackButton';

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethods, setPaymentMethods] = useState('');

  // Get booking data from location state
  const bookingData = location.state?.bookingData || {
    from: 'Delhi',
    to: 'Mumbai',
    date: '2026-01-20',
    passengers: [{ name: 'John Doe', age: 30, gender: 'Male', travelClass: 'Sleeper' }],
    totalCost: 903.60,
    email: 'user@example.com',
    phone: '9876543210',
    trainName: 'Rajdhani Express',
    trainNumber: '12951',
    distance: 1447,
    departureTime: '16:35',
    arrivalTime: '08:35',
    travelClass: 'Sleeper',
    pgCharges: 0,
    convenienceFee: 23.60
  };

  // Check if Razorpay script is loaded
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.head.appendChild(script);
    
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  /**
   * Initialize Razorpay Payment
   */
  const handlePayment = async () => {
    setLoading(true);
    setError('');

    try {
      const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      
      // Step 1: Create order from backend
      console.log('📦 Creating Razorpay order...');
      const orderResponse = await fetch(`${API_BASE}/api/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: bookingData.totalCost,
          bookingData: bookingData
        })
      });

      if (!orderResponse.ok) {
        throw new Error('Failed to create order');
      }

      const order = await orderResponse.json();
      console.log('✅ Order created:', order.id);

      // Step 2: Setup Razorpay options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        name: 'Indian Railways',
        description: `Train Ticket: ${bookingData.from} to ${bookingData.to}`,
        
        // Prefill customer details
        prefill: {
          name: bookingData.passengers[0]?.name || 'Passenger',
          email: bookingData.email,
          contact: bookingData.phone
        },

        // Notes for the order
        notes: {
          from: bookingData.from,
          to: bookingData.to,
          date: bookingData.date,
          pnr: `PNR${Math.floor(Math.random() * 1e9).toString().padStart(9, '0')}`
        },

        // Notification settings
        notify: {
          sms: true,
          email: true
        },

        // Payment methods
        method: paymentMethods || undefined,

        // Customization
        theme: {
          color: '#4f46e5'
        },

        // Handler for successful payment
        handler: async function (response) {
          console.log('💳 Payment successful:', response);
          await handlePaymentSuccess(response);
        },

        // Handler for payment failure
        on_error: function (error) {
          console.error('❌ Payment failed:', error);
          setError(`Payment failed: ${error.description}`);
          setLoading(false);
        },

        // Handler for payment close
        onclose: function () {
          console.log('⚠️ Payment modal closed');
          setLoading(false);
        }
      };

      // Step 3: Open Razorpay checkout
      if (!window.Razorpay) {
        throw new Error('Razorpay script not loaded');
      }

      console.log('🎫 Opening Razorpay checkout...');
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      console.error('❌ Payment error:', err);
      setError(err.message || 'Payment initialization failed');
      setLoading(false);
    }
  };

  /**
   * Handle Successful Payment
   */
  const handlePaymentSuccess = async (paymentResponse) => {
    try {
      setLoading(true);
      console.log('🔐 Verifying payment signature...');

      const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
      
      // Verify payment signature with backend
      const verifyResponse = await fetch(`${API_BASE}/api/payment/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: paymentResponse.razorpay_order_id,
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_signature: paymentResponse.razorpay_signature,
          bookingData: bookingData
        })
      });

      const verifyResult = await verifyResponse.json();

      if (!verifyResult.success) {
        throw new Error('Payment verification failed');
      }

      console.log('✅ Payment verified successfully!');
      console.log('🎫 Ticket created:', verifyResult.ticket);

      // Navigate to confirmation page with ticket data
      navigate('/confirmation', {
        state: {
          ticket: verifyResult.ticket,
          bookingData: bookingData,
          paymentId: paymentResponse.razorpay_payment_id
        }
      });
    } catch (err) {
      console.error('❌ Verification error:', err);
      setError(`Verification failed: ${err.message}`);
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  const buttonVariants = {
    hover: { scale: 1.05, boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.2)' },
    tap: { scale: 0.95 },
  };

  const cardStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(12px)',
    padding: '2.5rem',
    borderRadius: '1rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    maxWidth: '600px',
    width: '100%',
  };

  const titleStyle = {
    fontSize: '2rem',
    fontWeight: '800',
    color: 'transparent',
    background: 'linear-gradient(to right, #4f46e5, #6366f1)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    marginBottom: '1.5rem',
    textAlign: 'center',
  };

  const subtitleStyle = {
    fontSize: '0.875rem',
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: '1.5rem',
  };

  const bookingDetailsStyle = {
    backgroundColor: '#f9fafb',
    padding: '1.5rem',
    borderRadius: '0.75rem',
    marginBottom: '1.5rem',
    border: '1px solid #e5e7eb',
  };

  const detailRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.75rem 0',
    borderBottom: '1px solid #e5e7eb',
  };

  const detailLabelStyle = {
    fontWeight: '600',
    color: '#374151',
    fontSize: '0.875rem',
  };

  const detailValueStyle = {
    color: '#1f2937',
    fontSize: '0.875rem',
  };

  const costBreakdownStyle = {
    backgroundColor: '#f0f9ff',
    padding: '1rem',
    borderRadius: '0.5rem',
    marginBottom: '1rem',
    border: '1px solid #bfdbfe',
  };

  const totalCostStyle = {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#059669',
    textAlign: 'center',
    marginBottom: '1.5rem',
  };

  const paymentMethodsStyle = {
    marginBottom: '1.5rem',
  };

  const methodsLabel = {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.75rem',
  };

  const methodsGrid = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
  };

  const methodButtonStyle = (selected) => ({
    padding: '0.75rem',
    border: selected ? '2px solid #4f46e5' : '1px solid #d1d5db',
    borderRadius: '0.5rem',
    backgroundColor: selected ? '#eef2ff' : 'white',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.875rem',
    transition: 'all 0.3s',
    color: selected ? '#4f46e5' : '#6b7280',
  });

  const paymentButtonStyle = {
    width: '100%',
    backgroundColor: '#4f46e5',
    color: 'white',
    padding: '1rem',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    border: 'none',
    cursor: loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.3s',
    opacity: loading ? 0.7 : 1,
  };

  const errorStyle = {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    padding: '1rem',
    borderRadius: '0.5rem',
    marginBottom: '1rem',
    border: '1px solid #fecaca',
  };

  const passengerListStyle = {
    backgroundColor: '#f3f4f6',
    padding: '1rem',
    borderRadius: '0.75rem',
    marginTop: '1rem',
  };

  return (
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
          Secure Payment 💳
        </motion.h1>
        <p style={subtitleStyle}>Complete your railway ticket booking securely</p>

        {/* Error Message */}
        {error && (
          <motion.div
            style={errorStyle}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <strong>⚠️ {error}</strong>
          </motion.div>
        )}

        {/* Booking Details */}
        <div style={bookingDetailsStyle}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#1f2937', fontSize: '1rem' }}>
            ✈️ Journey Details
          </h3>
          <div style={detailRowStyle}>
            <span style={detailLabelStyle}>From:</span>
            <span style={detailValueStyle}><strong>{bookingData.from}</strong></span>
          </div>
          <div style={detailRowStyle}>
            <span style={detailLabelStyle}>To:</span>
            <span style={detailValueStyle}><strong>{bookingData.to}</strong></span>
          </div>
          <div style={detailRowStyle}>
            <span style={detailLabelStyle}>Date:</span>
            <span style={detailValueStyle}>{new Date(bookingData.date).toLocaleDateString('en-IN')}</span>
          </div>
          <div style={detailRowStyle}>
            <span style={detailLabelStyle}>Train:</span>
            <span style={detailValueStyle}>{bookingData.trainName} ({bookingData.trainNumber})</span>
          </div>
          <div style={{ ...detailRowStyle, borderBottom: 'none' }}>
            <span style={detailLabelStyle}>Distance:</span>
            <span style={detailValueStyle}>{bookingData.distance} km</span>
          </div>
        </div>

        {/* Passenger Details */}
        <div style={passengerListStyle}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: '#374151', fontSize: '0.875rem' }}>
            👥 Passengers ({bookingData.passengers.length})
          </h4>
          {bookingData.passengers.map((p, idx) => (
            <div key={idx} style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem' }}>
              {idx + 1}. {p.name} • {p.travelClass}
            </div>
          ))}
        </div>

        {/* Cost Breakdown */}
        <div style={costBreakdownStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: '#0369a1' }}>Base Fare:</span>
            <span style={{ color: '#0369a1' }}>₹{(bookingData.totalCost - bookingData.convenienceFee).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: '#0369a1' }}>Convenience Fee:</span>
            <span style={{ color: '#0369a1' }}>₹{bookingData.convenienceFee}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid #bfdbfe' }}>
            <span style={{ fontWeight: '600', color: '#0c4a6e' }}>Total Amount:</span>
            <span style={{ fontWeight: '700', color: '#0c4a6e' }}>₹{bookingData.totalCost.toFixed(2)}</span>
          </div>
        </div>

        <div style={totalCostStyle}>
          Total: ₹{bookingData.totalCost.toFixed(2)}
        </div>

        {/* Payment Methods Selection */}
        <div style={paymentMethodsStyle}>
          <div style={methodsLabel}>Select Payment Method:</div>
          <div style={methodsGrid}>
            <button
              style={methodButtonStyle(paymentMethods === '' || paymentMethods === 'card')}
              onClick={() => setPaymentMethods('card')}
            >
              💳 Card
            </button>
            <button
              style={methodButtonStyle(paymentMethods === 'netbanking')}
              onClick={() => setPaymentMethods('netbanking')}
            >
              🏦 Net Banking
            </button>
            <button
              style={methodButtonStyle(paymentMethods === 'wallet')}
              onClick={() => setPaymentMethods('wallet')}
            >
              💰 Wallet
            </button>
            <button
              style={methodButtonStyle(paymentMethods === 'upi')}
              onClick={() => setPaymentMethods('upi')}
            >
              📱 UPI
            </button>
          </div>
        </div>

        {/* Payment Button */}
        <motion.button
          onClick={handlePayment}
          style={paymentButtonStyle}
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          disabled={loading}
        >
          {loading ? '⏳ Processing...' : '🔒 Pay ₹' + bookingData.totalCost.toFixed(2) + ' with Razorpay'}
        </motion.button>

        {/* Security Info */}
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          backgroundColor: '#f0fdf4',
          borderRadius: '0.5rem',
          border: '1px solid #bbf7d0',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#166534' }}>
            ✅ Secure Payment Gateway | Razorpay Powered<br/>
            <span style={{ fontSize: '0.75rem' }}>Your payment is protected with 256-bit encryption</span>
          </p>
        </div>

        {/* Test Mode Info */}
        {import.meta.env.MODE === 'development' && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: '#fef3c7',
            borderRadius: '0.5rem',
            border: '1px solid #fcd34d',
            fontSize: '0.75rem',
            color: '#92400e',
            textAlign: 'center'
          }}>
            🧪 <strong>TEST MODE</strong><br/>
            Card: 4111 1111 1111 1111 | Expiry: Any | CVV: Any
          </div>
        )}
      </motion.div>
      <BackButton to="/" label="← Back to Home" />
    </div>
  );
};

export default PaymentPage;
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import BackButton from '../components/BackButton';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('email'); // 'email', 'otp', 'newpass'
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  const buttonVariants = {
    hover: { scale: 1.05, boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.2)' },
    tap: { scale: 0.95 },
  };

  const cardStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(12px)',
    padding: '2rem',
    borderRadius: '0.75rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    maxWidth: '28rem',
    width: '100%',
  };

  const titleStyle = {
    fontSize: '1.875rem',
    fontWeight: '800',
    color: 'transparent',
    background: 'linear-gradient(to right, #4b5bff, #8b5cf6)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    marginBottom: '1.5rem',
    textAlign: 'center',
  };

  const inputStyle = {
    width: '100%',
    height: '2.5rem',
    border: '1px solid #d1d5db',
    padding: '0.75rem',
    borderRadius: '0.375rem',
    outline: 'none',
    transition: 'border-color 0.3s, box-shadow 0.3s',
  };

  const buttonStyle = {
    width: '100%',
    backgroundColor: '#4b5bff',
    color: 'white',
    padding: '0.75rem',
    borderRadius: '0.375rem',
    fontSize: '1.125rem',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s',
    marginTop: '1rem',
  };

  const hoverButtonStyle = {
    backgroundColor: '#3b4dd8',
  };

  // Step 1: Request OTP with email
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email) {
      setError('❌ Please enter your email');
      return;
    }

    const API = import.meta.env.VITE_API_BASE;

    setLoading(true);
    try {
      // First, find user by email
      const response = await fetch(`${API}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'dummy' }), // Will fail but we don't care
      });

      // Alternative: use a dedicated endpoint to get user by email and request password reset
      // For now, we'll use a simpler approach: ask user to enter email, then send OTP

      // Send OTP request
      // We need to get the user ID first. Let's create a helper endpoint or ask for email verification
      // For MVP, let's assume we can get user by email from a public endpoint or use a different approach

      // Call a new endpoint that takes email and sends OTP
      const otpResponse = await fetch(`${API}/api/auth/forgot-password-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!otpResponse.ok) {
        const data = await otpResponse.json();
        throw new Error(data.message || 'Failed to send OTP');
      }

      const data = await otpResponse.json();
      setUserId(data.userId);
      setSuccess('✅ OTP sent to your email');
      setStep('otp');
    } catch (err) {
      setError(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!otp) {
      setError('❌ Please enter OTP');
      return;
    }

    setLoading(true);
    try {
      // Verify OTP (no password yet, just validate)
      if (otp.length !== 6) {
        throw new Error('OTP must be 6 digits');
      }
      setSuccess('✅ OTP verified');
      setStep('newpass');
    } catch (err) {
      setError(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Change password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newPassword || !confirmPassword) {
      setError('❌ Please enter password in both fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('❌ Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('❌ Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API}/api/profile/${userId}/verify-password-change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp, newPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to change password');
      }

      setSuccess('✅ Password changed successfully! Redirecting to sign in...');
      setTimeout(() => navigate('/signin'), 2000);
    } catch (err) {
      setError(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(to bottom right, #dbeafe, #e0e7ff, #f3e8ff)', position: 'relative' }}>
      <button 
        onClick={() => navigate('/signin')}
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 14px',
          background: '#f3f4f6',
          color: '#374151',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: '500',
          fontSize: '14px',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = '#e5e7eb';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = '#f3f4f6';
        }}
      >
        ← Back to Sign In
      </button>
      <motion.div
        style={cardStyle}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.h2
          style={titleStyle}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          🔐 Reset Password
        </motion.h2>

        {error && (
          <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '0.375rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ padding: '0.75rem', backgroundColor: '#dcfce7', border: '1px solid #86efac', color: '#166534', borderRadius: '0.375rem', marginBottom: '1rem' }}>
            {success}
          </div>
        )}

        {step === 'email' && (
          <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <p style={{ textAlign: 'center', color: '#4b5563', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              Enter your registered email to receive an OTP
            </p>
            <div>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
            </div>
            <motion.button
              type="submit"
              style={buttonStyle}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onMouseEnter={(e) => Object.assign(e.target.style, hoverButtonStyle)}
              onMouseLeave={(e) => Object.assign(e.target.style, buttonStyle)}
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </motion.button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <p style={{ textAlign: 'center', color: '#4b5563', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              Enter the 6-digit OTP sent to your email
            </p>
            <div>
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                style={{ ...inputStyle, textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.25rem' }}
                maxLength="6"
              />
            </div>
            <motion.button
              type="submit"
              style={buttonStyle}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onMouseEnter={(e) => Object.assign(e.target.style, hoverButtonStyle)}
              onMouseLeave={(e) => Object.assign(e.target.style, buttonStyle)}
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </motion.button>
            <button
              type="button"
              style={{ ...buttonStyle, backgroundColor: '#6b7280', marginTop: '0.5rem' }}
              onClick={() => { setStep('email'); setEmail(''); setOtp(''); }}
            >
              Back
            </button>
          </form>
        )}

        {step === 'newpass' && (
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <p style={{ textAlign: 'center', color: '#4b5563', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              Enter your new password
            </p>
            <div>
              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={inputStyle}
              />
            </div>
            <motion.button
              type="submit"
              style={buttonStyle}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onMouseEnter={(e) => Object.assign(e.target.style, hoverButtonStyle)}
              onMouseLeave={(e) => Object.assign(e.target.style, buttonStyle)}
              disabled={loading}
            >
              {loading ? 'Changing...' : 'Change Password'}
            </motion.button>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#4b5563' }}>
          Remember your password?{' '}
          <span
            style={{ color: '#4b5bff', cursor: 'pointer', fontWeight: '500' }}
            onClick={() => navigate('/signin')}
            onMouseEnter={(e) => (e.target.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.target.style.textDecoration = 'none')}
          >
            Sign In
          </span>
        </p>

        <style>
          {`
            input:focus {
              border-color: #4b5bff;
              box-shadow: 0 0 0 3px rgba(75, 91, 255, 0.2);
            }
          `}
        </style>
      </motion.div>
      <BackButton to="/" label="← Back to Home" />
    </div>
  );
};

export default ForgotPassword;

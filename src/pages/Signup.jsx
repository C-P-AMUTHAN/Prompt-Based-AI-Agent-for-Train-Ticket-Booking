import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import NotificationModal from '../components/NotificationModal';
import BackButton from '../components/BackButton';

const Signup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Basic Info, 2: Email OTP, 3: Success
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [userId, setUserId] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [notification, setNotification] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const API = import.meta.env.VITE_API_BASE;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (step === 1) {
      // Submit basic info and go to email OTP
      if (!form.name || !form.email || !form.password) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API}/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });

        const data = await response.json();

        if (response.ok) {
          setUserId(data.userId);
          setStep(2);
        } else {
          setError(data.message || 'Signup failed');
        }
      } catch (error) {
        setError('Error connecting to server');
      }
    } else if (step === 2) {
      // Verify email OTP
      if (!emailOtp) {
        setError('Please enter OTP');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API}/api/auth/signup/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, otp: emailOtp }),
        });

        const data = await response.json();

        if (response.ok) {
          // Store token and user data immediately after email verification
          if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('loggedIn', 'true');
            if (data.user) {
              localStorage.setItem('user', JSON.stringify({
                id: data.user._id || data.user.id,
                name: data.user.name,
                email: data.user.email,
                phone: form.phone,
                role: data.user.role || 'user',
              }));
              localStorage.setItem('role', data.user.role || 'user');
            }
          }
          setStep(3);
        } else {
          setError(data.message || 'Invalid OTP');
        }
      } catch (error) {
        setError('Error verifying OTP');
      }
    }

    setLoading(false);
  };

  const handleResendOtp = async (type) => {
    setResendLoading(true);
    setError('');

    try {
      const response = await fetch(`${API}/api/auth/signup/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, type }),
      });

      const data = await response.json();

      if (response.ok) {
        setNotification({
          isOpen: true,
          title: 'OTP Resent',
          message: `OTP resent to your ${type}`,
          type: 'success'
        });
        setResendCooldown(30);
        const timer = setInterval(() => {
          setResendCooldown(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(data.message || 'Failed to resend OTP');
      }
    } catch (error) {
      setError('Error resending OTP');
    }

    setResendLoading(false);
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
    background: 'linear-gradient(to right, #16a34a, #34d399)',
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
    backgroundColor: '#16a34a',
    color: 'white',
    padding: '0.75rem',
    borderRadius: '0.375rem',
    fontSize: '1.125rem',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s',
  };

  const hoverButtonStyle = {
    backgroundColor: '#15803d',
  };

  const progressBarStyle = {
    width: '100%',
    height: '4px',
    backgroundColor: '#e5e7eb',
    borderRadius: '2px',
    marginBottom: '1.5rem',
    overflow: 'hidden',
  };

  const progressFillStyle = {
    height: '100%',
    backgroundColor: '#16a34a',
    width: `${(step / 4) * 100}%`,
    transition: 'width 0.3s ease',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(to bottom right, #dbeafe, #e0e7ff, #f3e8ff)' }}>
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
          {step === 1 ? 'Sign Up 🌱' : step === 2 ? 'Verify Email 📧' : step === 3 ? 'Verify Phone 📱' : 'Welcome! 🎉'}
        </motion.h2>

        {/* Progress Bar */}
        <div style={progressBarStyle}>
          <div style={progressFillStyle}></div>
        </div>

        {/* Step Indicator */}
        <p style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#666' }}>
          Step {step} of {form.phone ? 4 : 3}
        </p>

        {error && (
          <div style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
          }}>
            ❌ {error}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={form.name}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>
            <div>
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>
            <div>
              <input
                type="tel"
                name="phone"
                placeholder="Phone Number (optional)"
                value={form.phone}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>
            <div>
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>
            <motion.button
              type="submit"
              style={buttonStyle}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              disabled={loading}
              onMouseEnter={(e) => !loading && Object.assign(e.target.style, hoverButtonStyle)}
              onMouseLeave={(e) => Object.assign(e.target.style, buttonStyle)}
            >
              {loading ? 'Creating Account...' : 'Continue'}
            </motion.button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <p style={{ color: '#666', fontSize: '0.95rem' }}>
              We've sent an OTP to <strong>{form.email}</strong>
            </p>
            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              value={emailOtp}
              onChange={(e) => setEmailOtp(e.target.value.slice(0, 6))}
              style={{ ...inputStyle, fontSize: '1.5rem', textAlign: 'center', letterSpacing: '0.5rem' }}
              maxLength="6"
            />
            <motion.button
              type="submit"
              style={buttonStyle}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </motion.button>
            <button
              type="button"
              onClick={() => handleResendOtp('email')}
              disabled={resendCooldown > 0 || resendLoading}
              style={{
                background: 'none',
                border: 'none',
                color: '#16a34a',
                cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                opacity: resendCooldown > 0 ? 0.5 : 1,
              }}
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
            </button>
          </form>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '1rem' }}>
              Registration successful! You can now start booking tickets.
            </p>
            <motion.button
              onClick={() => {
                navigate('/');
              }}
              style={{ ...buttonStyle, marginTop: '1rem' }}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              Go to Home
            </motion.button>
          </div>
        )}

        <style>
          {`
            input:focus {
              border-color: #16a34a;
              box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.2);
            }
          `}
        </style>

        {step === 1 && (
          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#4b5563' }}>
            Already have an account?{' '}
            <span
              style={{ color: '#16a34a', cursor: 'pointer', fontWeight: '500' }}
              onClick={() => navigate('/signin')}
              onMouseEnter={(e) => (e.target.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.target.style.textDecoration = 'none')}
            >
              Sign In
            </span>
          </p>
        )}
      </motion.div>

      <NotificationModal
        isOpen={notification.isOpen}
        title={notification.title}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ ...notification, isOpen: false })}
      />

      <BackButton to="/" label="← Back to Home" />
    </div>
  );
};

export default Signup;

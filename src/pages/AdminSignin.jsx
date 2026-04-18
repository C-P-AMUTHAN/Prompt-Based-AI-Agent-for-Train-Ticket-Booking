// src/pages/AdminSignin.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import './Home.css'; // ✅ Reuse same styles as Home
import NotificationModal from '../components/NotificationModal';
import BackButton from '../components/BackButton';

const AdminSignin = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [notification, setNotification] = useState({ isOpen: false, title: '', message: '', type: 'info' });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { email, password } = form;

    // ✅ Hardcoded Admin Credentials
    if (email === 'admin@gmail.com' && password === 'admin2228') {
      localStorage.setItem('token', 'admin-token');
      localStorage.setItem('role', 'admin');
      setNotification({ isOpen: true, title: 'Success', message: 'Admin login successful!', type: 'success' });
      setTimeout(() => navigate('/admin'), 1500);
    } else {
      setNotification({ isOpen: true, title: 'Error', message: 'Invalid admin credentials!', type: 'error' });
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

  return (
    <div className="home-container">
      <motion.header
        className="home-header"
        // initial="hidden"
        // animate="visible"
        variants={containerVariants}
      >
        <h1 className="home-title">
          Railway Express 🚆
        </h1>
      </motion.header>

      <motion.main
        className="home-main"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        transition={{ delay: 0.2 }}
      >
        <motion.div
          className="signin-card"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.h2
            className="home-heading"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            Admin Login 🔑
          </motion.h2>

          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}
          >
            <input
              type="email"
              name="email"
              placeholder="Admin Email"
              value={form.email}
              onChange={handleChange}
              className="form-input"
            />
            <input
              type="password"
              name="password"
              placeholder="Admin Password"
              value={form.password}
              onChange={handleChange}
              className="form-input"
            />

            <motion.button
              type="submit"
              className="btn btn-warning"
              initial={{ opacity: 1, scale: 1 }}
            >
              Sign In
            </motion.button>
          </form>
        </motion.div>
      </motion.main>

      <motion.footer
        className="home-footer"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        transition={{ delay: 0.4 }}
      >
        <p className="footer-text">
          Developed with ❤️ by{' '}
          <a href="mailto:amuthancp@example.com" className="footer-link">
            Railway Express Team
          </a>
        </p>
      </motion.footer>
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

export default AdminSignin;

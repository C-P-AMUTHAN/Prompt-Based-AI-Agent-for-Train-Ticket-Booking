import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import NotificationModal from '../components/NotificationModal';
import BackButton from '../components/BackButton';
import './Home.css';

const Home = () => {
  const [user, setUser] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [notification, setNotification] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const navigate = useNavigate();

  const API = import.meta.env.VITE_API_BASE;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          if (res.ok) {
            return res.json();
          } else if (res.status === 401) {
            localStorage.removeItem('token');
            return null;
          } else {
            return null;
          }
        })
        .then(data => setUser(data))
        .catch(() => setUser(null));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setShowPopup(false);
  };

  const handleBookNow = () => {
    if (!user) {
      setNotification({
        isOpen: true,
        title: 'Login Required',
        message: 'Please log in to continue.',
        type: 'info'
      });
      setTimeout(() => {
        navigate('/signin?redirect=/booking');
      }, 1500);
    } else {
      navigate('/booking');
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
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <h1 className="home-title">
          Railway Express 🚆
        </h1>
        <div className="header-buttons">
          {!user ? (
            <>
              <motion.button
                onClick={() => navigate('/signin')}
                className="btn btn-primary"
                initial={{ opacity: 1, scale: 1 }}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                Sign In
              </motion.button>
              <motion.button
                onClick={() => navigate('/signup')}
                className="btn btn-success"
                initial={{ opacity: 1, scale: 1 }}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                Sign Up
              </motion.button>
              <motion.button
                onClick={() => navigate('/admin-signin')}
                className="btn btn-warning"
                initial={{ opacity: 1, scale: 1 }}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                Admin Login
              </motion.button>
            </>
          ) : (
            <div className="user-info">
              <span
                style={{ cursor: 'pointer', fontSize: 24 }}
                onClick={() => setShowPopup(true)}
                title="User Profile"
              >👤</span>
              {showPopup && (
                <div className="popup">
                  <h3>👤 Profile</h3>
                  <ul className="popup-list">
                    <li className="popup-list-item">
                      <button
                        onClick={() => { setShowPopup(false); navigate('/profile'); }}
                        className="btn-view"
                      >
                        📋 View Profile Details
                      </button>
                    </li>
                    <li className="popup-list-item">
                      <button
                        onClick={() => { setShowPopup(false); navigate('/profile?tab=tickets'); }}
                        className="btn-view"
                      >
                        🎫 My Tickets
                      </button>
                    </li>
                    <li className="popup-list-item">
                      <button onClick={handleLogout} className="btn-logout">🚪 Logout</button>
                    </li>
                    <li className="popup-list-item">
                      <button onClick={() => setShowPopup(false)} className="btn-close">✕ Close</button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.header>

      <motion.main
        className="home-main"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        transition={{ delay: 0.2 }}
      >
        <motion.h2
          className="home-heading"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          Book Train Tickets in <span>Seconds</span>
        </motion.h2>
        <motion.p
          className="home-description"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          Seamlessly search for trains, book tickets, manage bookings, track trains in real-time,
          and enjoy secure payments — all in one platform powered by AI Automation!
        </motion.p>
        <motion.button
          onClick={handleBookNow}
          className="book-now-btn"
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
        >
          <span>🚀 Book Now</span>
        </motion.button>
        <button
          style={{ margin: '1em 0', padding: '0.5em 1em', fontSize: '1em' }}
          onClick={() => navigate('/prompt-booking')}
        >
          Go to Prompt Booking
        </button>
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
    </div>
  );
};

export default Home;
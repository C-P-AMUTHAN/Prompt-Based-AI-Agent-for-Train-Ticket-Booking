import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Navigation.css';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [user, setUser] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Check login status
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setIsLoggedIn(true);
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        setUser({ name: 'User' });
      }
    } else {
      setIsLoggedIn(false);
      setUser(null);
    }
  }, [location]); // Re-check on route change

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    localStorage.removeItem('loggedIn');
    setIsLoggedIn(false);
    setUser(null);
    setShowDropdown(false);
    navigate('/signin');
  };

  const handleProfileClick = () => {
    navigate('/profile');
    setShowDropdown(false);
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <motion.nav
      className="navigation"
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
    >
      <div className="nav-container">
        {/* Main Navigation Links */}
        <motion.div variants={itemVariants}>
          <Link
            to="/"
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            🏠 Home
          </Link>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Link
            to="/bookings"
            className={`nav-link ${location.pathname === '/bookings' ? 'active' : ''}`}
          >
            📚 My Bookings
          </Link>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Link
            to="/track"
            className={`nav-link ${location.pathname === '/track' ? 'active' : ''}`}
          >
            🚂 Track Train
          </Link>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Link
            to="/coach"
            className={`nav-link ${location.pathname === '/coach' ? 'active' : ''}`}
          >
            🚆 Coach Position
          </Link>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Link
            to="/prompt-booking"
            className={`nav-link ${location.pathname === '/prompt-booking' ? 'active' : ''}`}
          >
            ⚡ Quick Booking
          </Link>
        </motion.div>

        {/* Right side: Auth buttons or Profile dropdown */}
        <motion.div variants={itemVariants} className="nav-auth">
          {isLoggedIn ? (
            // ✅ LOGGED IN: Show profile logo with dropdown
            <div className="profile-section" ref={dropdownRef}>
              <button
                className="profile-logo-btn"
                onClick={() => setShowDropdown(!showDropdown)}
                title="Click to see options"
              >
                👤
              </button>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {showDropdown && (
                  <motion.div
                    className="profile-dropdown"
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="dropdown-header">
                      <div className="user-info">
                        <p className="user-name">👤 {user?.name || 'User'}</p>
                        <p className="user-email">{user?.email || ''}</p>
                      </div>
                    </div>

                    <div className="dropdown-divider"></div>

                    <button
                      className="dropdown-item"
                      onClick={handleProfileClick}
                    >
                      <span className="dropdown-icon">📋</span>
                      Profile Details
                    </button>

                    <button
                      className="dropdown-item"
                      onClick={handleLogout}
                    >
                      <span className="dropdown-icon">🚪</span>
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            // ❌ NOT LOGGED IN: Show Sign In, Sign Up, Admin buttons
            <>
              <Link
                to="/signin"
                className={`nav-link signin ${location.pathname === '/signin' ? 'active' : ''}`}
              >
                Sign In
              </Link>

              <Link
                to="/signup"
                className={`nav-link signup ${location.pathname === '/signup' ? 'active' : ''}`}
              >
                Sign Up
              </Link>

              <Link
                to="/admin-signin"
                className={`nav-link admin ${location.pathname === '/admin-signin' ? 'active' : ''}`}
              >
                Admin
              </Link>
            </>
          )}
        </motion.div>
      </div>
    </motion.nav>
  );
};

export default Navigation;
            </motion.div>
          </>
        )}
      </div>
    </motion.nav>
  );
};

export default Navigation;
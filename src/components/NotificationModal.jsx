import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationModal = ({ isOpen, title, message, type = 'info', onClose, closeButton = true }) => {
  // type: 'success', 'error', 'info', 'warning'
  
  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          bgColor: '#f0fdf4',
          borderColor: '#86efac',
          titleColor: '#059669',
          icon: '✅',
        };
      case 'error':
        return {
          bgColor: '#fef2f2',
          borderColor: '#fca5a5',
          titleColor: '#dc2626',
          icon: '❌',
        };
      case 'warning':
        return {
          bgColor: '#fffbeb',
          borderColor: '#fcd34d',
          titleColor: '#b45309',
          icon: '⚠️',
        };
      default:
        return {
          bgColor: '#f0f9ff',
          borderColor: '#bfdbfe',
          titleColor: '#0369a1',
          icon: 'ℹ️',
        };
    }
  };

  const colors = getColors();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              backgroundColor: colors.bgColor,
              border: `2px solid ${colors.borderColor}`,
              borderRadius: '0.75rem',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Title with Icon */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '2rem', marginRight: '0.75rem' }}>{colors.icon}</span>
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: colors.titleColor,
                }}
              >
                {title}
              </h2>
            </div>

            {/* Message */}
            <p
              style={{
                margin: '1rem 0',
                fontSize: '0.95rem',
                color: '#374151',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
              }}
            >
              {message}
            </p>

            {/* Close Button */}
            {closeButton && (
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <motion.button
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1.5rem',
                    backgroundColor: colors.titleColor,
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Close
                </motion.button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationModal;

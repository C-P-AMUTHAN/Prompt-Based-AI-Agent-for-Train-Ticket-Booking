import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const BackButton = ({ to = '/', label = '← Back to Home', showOnAllPages = true }) => {
  const navigate = useNavigate();

  return (
    <motion.button
      onClick={() => navigate(to)}
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        padding: '0.75rem 1.5rem',
        backgroundColor: '#4f46e5',
        color: 'white',
        border: 'none',
        borderRadius: '0.5rem',
        fontSize: '0.9rem',
        fontWeight: '600',
        cursor: 'pointer',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        zIndex: 100,
        transition: 'all 0.3s',
      }}
      whileHover={{ scale: 1.05, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)' }}
      whileTap={{ scale: 0.95 }}
    >
      {label}
    </motion.button>
  );
};

export default BackButton;

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import NotificationModal from '../components/NotificationModal';
import BackButton from '../components/BackButton';

const SearchResults = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [selectedTrain, setSelectedTrain] = useState(null);
  const [filteredTrains, setFilteredTrains] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({ isOpen: false, title: '', message: '', type: 'info' });

  // Initialize from location state if coming from BookingForm
  React.useEffect(() => {
    if (location.state && location.state.searchResults) {
      setFilteredTrains(location.state.searchResults);
      setSearchPerformed(true);
      if (location.state.from) setSource(location.state.from);
      if (location.state.to) setDestination(location.state.to);
    }
  }, [location.state]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!source || !destination) {
      setNotification({ isOpen: true, title: 'Missing Fields', message: 'Please select both source and destination', type: 'warning' });
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/trains/live-search?from=${encodeURIComponent(source)}&to=${encodeURIComponent(destination)}&date=${new Date().toISOString().split('T')[0]}`
      );
      const data = await response.json();
      setFilteredTrains(data || []);
      setSearchPerformed(true);
    } catch (error) {
      console.error('Error fetching trains:', error);
      setNotification({ isOpen: true, title: 'Search Error', message: 'Error searching trains. Please try again.', type: 'error' });
      setFilteredTrains([]);
      setSearchPerformed(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrainSelect = (train) => {
    setSelectedTrain(train);
    navigate('/booking', { state: { selectedTrain: train } });
  };

  // Format price with rupee symbol
  const formatPrice = (price) => {
    return `₹${Math.round(price).toLocaleString('en-IN')}`;
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  const buttonVariants = {
    hover: { scale: 1.05, boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.2)' },
    tap: { scale: 0.95 },
  };

  const trainCardVariants = {
    hover: {
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      borderColor: '#4b5bff',
      backgroundColor: '#f8fafc',
      transition: { duration: 0.2, ease: 'easeOut' }
    }
  };

  const cardStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(12px)',
    padding: '2rem',
    borderRadius: '0.75rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    maxWidth: '800px',
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
    fontSize: '1rem',
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
  };

  const trainCardStyle = {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '0.5rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    border: '1px solid #e5e7eb',
    position: 'relative',
    zIndex: 1,
  };

  const textStyle = {
    color: '#1f2937',
    fontSize: '1rem',
    margin: '0.25rem 0',
  };

  const priceStyle = {
    color: '#059669',
    fontWeight: '600',
    fontSize: '1.25rem',
  };

  const distanceStyle = {
    color: '#6b7280',
    fontSize: '0.875rem',
    marginTop: '0.5rem',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(to bottom right, #dbeafe, #e0e7ff, #f3e8ff)', padding: '1rem', position: 'relative' }}>
      <button 
        onClick={() => navigate(-1)}
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
        ← Back
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
          Search Trains 🚂
        </motion.h2>

        {/* Search Form */}
        <form onSubmit={handleSearch} style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <input
                placeholder="From (e.g., Mumbai)"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
            <div>
              <input
                placeholder="To (e.g., Delhi)"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
            <motion.button
              type="submit"
              style={buttonStyle}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              disabled={isLoading}
            >
              {isLoading ? '⏳ Searching...' : '🔍 Search Trains'}
            </motion.button>
          </div>
        </form>

        {/* Search Results */}
        {searchPerformed && (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>
              Available Trains ({filteredTrains.length})
            </h3>
            {filteredTrains.length === 0 ? (
              <p style={{ color: '#6b7280', textAlign: 'center', padding: '1rem' }}>
                No trains found for the selected route. Please try different source and destination.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredTrains.map((train, index) => {
                  // Extract train information from various formats
                  const trainName = train.name || train.train_name || '';
                  const trainNumber = train.number || train.train_no || '';
                  const departureTime = train.departureTime || train.from_time || '';
                  const arrivalTime = train.arrivalTime || train.to_time || '';
                  const distance = train.distance || 0;
                  const sleeperPrice = train.pricing?.sleeper || train.pricing?.allClasses?.Sleeper || 400;
                  
                  return (
                    <motion.div
                      key={train._id || index}
                      style={trainCardStyle}
                      variants={trainCardVariants}
                      whileHover="hover"
                      onClick={() => handleTrainSelect(train)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                          <h4 style={{ fontWeight: '600', color: '#1f2937', fontSize: '1.125rem', margin: 0 }}>
                            {trainName} {trainNumber && `(${trainNumber})`}
                          </h4>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={priceStyle}>
                            {formatPrice(sleeperPrice)}
                          </div>
                          <div style={distanceStyle}>
                            {distance ? `${distance} km` : 'Distance TBD'}
                          </div>
                        </div>
                      </div>
                      <p style={textStyle}>
                        <span style={{ fontWeight: '500' }}>⏰ Time:</span> {departureTime} → {arrivalTime}
                      </p>
                      {distance > 0 && (
                        <p style={distanceStyle}>
                          <span style={{ fontWeight: '500' }}>📏 Distance:</span> {distance} km
                        </p>
                      )}
                      {train.pricing && train.pricing.allClasses && (
                        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                          <span style={{ fontWeight: '500' }}>Class Options:</span> Sleeper: {formatPrice(train.pricing.allClasses['Sleeper'])} | AC 3T: {formatPrice(train.pricing.allClasses['AC 3-Tier'])} | AC 2T: {formatPrice(train.pricing.allClasses['AC 2-Tier'])}
                        </p>
                      )}
                      <p style={{ color: '#4b5bff', fontWeight: '500', marginTop: '0.75rem' }}>
                        Click to select this train →
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <style>
          {`
            input:focus {
              border-color: #4b5bff;
              box-shadow: 0 0 0 3px rgba(75, 91, 255, 0.2);
            }
          `}
        </style>
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

export default SearchResults;
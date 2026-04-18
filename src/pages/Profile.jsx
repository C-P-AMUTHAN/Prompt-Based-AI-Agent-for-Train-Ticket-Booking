import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import TicketSlip from '../components/TicketSlip';
import BackButton from '../components/BackButton';
import './Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showVerification, setShowVerification] = useState(null); // 'email' or 'phone'
  const [verificationOtp, setVerificationOtp] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordChangeStep, setPasswordChangeStep] = useState('request'); // 'request', 'otp', 'newpass'
  const [passwordChangeOtp, setPasswordChangeOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    phone: '',
    address: '',
    aadharNumber: ''
  });

  // Fetch user profile on mount
  useEffect(() => {
    fetchUserProfile();
  }, []);

  // Link any unlinked tickets when component mounts
  useEffect(() => {
    const linkTickets = async () => {
      try {
        const token = localStorage.getItem('token');
        const currentUser = localStorage.getItem('user');
        
        if (!token || !currentUser) return;

        const user = JSON.parse(currentUser);
        
        // Call link endpoint to link any unlinked tickets
        await fetch(`http://localhost:5000/api/tickets/link-tickets/${user.id}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (err) {
        console.log('Ticket linking attempt completed');
      }
    };

    linkTickets();
  }, []);

  // Fetch tickets when tab changes to tickets
  useEffect(() => {
    if (activeTab === 'tickets' && user) {
      fetchUserTickets();
    }
  }, [activeTab, user]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const currentUser = localStorage.getItem('user');
      
      if (!token || !currentUser) {
        navigate('/signin');
        return;
      }

      const user = JSON.parse(currentUser);
      const response = await fetch(`http://localhost:5000/api/profile/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setUser(data.user);
      setFormData({
        name: data.user.name || '',
        age: data.user.age || '',
        gender: data.user.gender || '',
        phone: data.user.phone || '',
        address: data.user.address || '',
        aadharNumber: data.user.aadharNumber || ''
      });
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchUserTickets = async () => {
    try {
      setTicketsLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const currentUser = JSON.parse(localStorage.getItem('user'));

      const response = await fetch(`http://localhost:5000/api/tickets/user/${currentUser.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tickets');
      }

      const data = await response.json();
      setTickets(data.tickets || []);
      setTicketsLoading(false);
    } catch (err) {
      setError(err.message);
      setTicketsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      setError('');
      setSuccess('');
      const token = localStorage.getItem('token');
      const currentUser = JSON.parse(localStorage.getItem('user'));

      const response = await fetch(`http://localhost:5000/api/profile/${currentUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const data = await response.json();
      setUser(data.user);
      setSuccess('✅ Profile updated successfully');
      setIsEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(`❌ ${err.message}`);
    }
  };

  const handleRequestPhoneChange = async () => {
    try {
      setError('');
      setSuccess('');
      const token = localStorage.getItem('token');
      const currentUser = JSON.parse(localStorage.getItem('user'));

      const response = await fetch(`http://localhost:5000/api/profile/${currentUser.id}/change-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPhone: formData.phone })
      });

      if (!response.ok) {
        throw new Error('Failed to request phone change');
      }

      setShowVerification('phone');
      setSuccess('📱 OTP sent to your new phone number');
    } catch (err) {
      setError(`❌ ${err.message}`);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      setError('');
      setSuccess('');
      const token = localStorage.getItem('token');
      const currentUser = JSON.parse(localStorage.getItem('user'));

      const endpoint = showVerification === 'phone' 
        ? 'verify-phone-change' 
        : 'verify-email-change';

      const response = await fetch(
        `http://localhost:5000/api/profile/${currentUser.id}/${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ otp: verificationOtp })
        }
      );

      if (!response.ok) {
        throw new Error('Invalid OTP');
      }

      const data = await response.json();
      setUser(prev => ({ ...prev, ...data.user }));
      setShowVerification(null);
      setVerificationOtp('');
      setSuccess(`✅ ${showVerification} updated successfully`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(`❌ ${err.message}`);
    }
  };

  // Delete account handlers
  const handleDeleteAccountClick = () => {
    setDeletePassword('');
    setShowDeleteModal(true);
  };

  const handleDeleteAccount = async () => {
    try {
      setError('');
      if (!deletePassword) {
        setError('❌ Password is required');
        return;
      }

      const token = localStorage.getItem('token');
      const currentUser = JSON.parse(localStorage.getItem('user'));

      const response = await fetch(`http://localhost:5000/api/profile/${currentUser.id}/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: deletePassword })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete account');
      }

      setSuccess('✅ Account deleted successfully');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      localStorage.removeItem('loggedIn');
      setTimeout(() => navigate('/signin'), 2000);
    } catch (err) {
      setError(`❌ ${err.message}`);
    }
  };

  // Change password handlers
  const handleRequestPasswordChange = async () => {
    try {
      setError('');
      const token = localStorage.getItem('token');
      const currentUser = JSON.parse(localStorage.getItem('user'));

      const response = await fetch(`http://localhost:5000/api/profile/${currentUser.id}/request-password-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to request password change');
      }

      setSuccess('✅ OTP sent to your email');
      setPasswordChangeStep('otp');
    } catch (err) {
      setError(`❌ ${err.message}`);
    }
  };

  const handleVerifyPasswordChangeOtp = async () => {
    try {
      setError('');
      if (!passwordChangeOtp) {
        setError('❌ OTP is required');
        return;
      }

      const token = localStorage.getItem('token');
      const currentUser = JSON.parse(localStorage.getItem('user'));

      // Just validate OTP, actual password change happens in next step
      // For now, move to next step if OTP looks valid
      if (passwordChangeOtp.length === 6) {
        setPasswordChangeStep('newpass');
      } else {
        setError('❌ OTP must be 6 digits');
      }
    } catch (err) {
      setError(`❌ ${err.message}`);
    }
  };

  const handleChangePassword = async () => {
    try {
      setError('');
      if (!newPassword || !confirmPassword) {
        setError('❌ Password fields are required');
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

      const token = localStorage.getItem('token');
      const currentUser = JSON.parse(localStorage.getItem('user'));

      const response = await fetch(`http://localhost:5000/api/profile/${currentUser.id}/verify-password-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ otp: passwordChangeOtp, newPassword })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to change password');
      }

      setSuccess('✅ Password changed successfully');
      setShowChangePasswordModal(false);
      setPasswordChangeStep('request');
      setPasswordChangeOtp('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(`❌ ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-200 via-purple-100 to-pink-200">
        <p className="text-lg text-gray-700">Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-200 via-purple-100 to-pink-200">
        <p className="text-lg text-gray-700">User not found</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <motion.div
        className="profile-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="profile-header">
          <h1>👤 My Profile</h1>
          <p>Manage your account information</p>
        </div>

        {/* Content */}
        <div className="profile-content space-y-8">
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
              {success}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="profile-tabs">
            <button 
              className={`profile-tab ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              👤 Profile
            </button>
            <button 
              className={`profile-tab ${activeTab === 'tickets' ? 'active' : ''}`}
              onClick={() => setActiveTab('tickets')}
            >
              🎫 My Tickets
            </button>
          </div>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <>
          {/* Basic Information */}
          <div className="section">
            <h2>📋 Basic Information</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} disabled={!isEditing} className="input" />
              </div>
              <div className="form-group">
                <label>Age</label>
                <input type="number" name="age" value={formData.age} onChange={handleInputChange} disabled={!isEditing} className="input" />
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select name="gender" value={formData.gender} onChange={handleInputChange} disabled={!isEditing} className="input">
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Address</label>
                <input type="text" name="address" value={formData.address} onChange={handleInputChange} disabled={!isEditing} className="input" />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Aadhar Number</label>
                <input type="text" name="aadharNumber" value={formData.aadharNumber} onChange={handleInputChange} disabled={!isEditing} className="input" placeholder="XXXX XXXX XXXX" />
              </div>
            </div>

            <div className="actions">
              {isEditing ? (
                <>
                  <button onClick={() => { setIsEditing(false); fetchUserProfile(); }} className="btn btn-outline">Cancel</button>
                  <button onClick={handleSaveProfile} className="btn btn-primary">✅ Save Changes</button>
                </>
              ) : (
                <button onClick={() => setIsEditing(true)} className="btn btn-primary">✏️ Edit Profile</button>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="section">
            <h2>📞 Contact Information</h2>
            <div className="contact-grid">
              <div className="form-group">
                <label>Gmail ID</label>
                <input type="email" value={user.email} disabled className="input" />
                <span className="mt-2">{user.emailVerified ? '✅ Verified' : '⚠️ Not Verified'}</span>
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} disabled={!isEditing} className="input" />
                <span className="mt-2">{user.phoneVerified ? '✅ Verified' : '⚠️ Not Verified'}</span>
              </div>
            </div>

            {isEditing && formData.phone !== user.phone && (
              <button onClick={handleRequestPhoneChange} className="verify-btn">🔔 Verify New Phone</button>
            )}
          </div>

          {/* Security */}
          <div className="section">
            <h2>🔒 Account Security</h2>
            <div className="security-actions">
              <button onClick={() => setShowChangePasswordModal(true)} className="btn btn-outline">🔐 Change Password</button>
              <button onClick={handleDeleteAccountClick} className="btn btn-danger">🗑️ Delete Account</button>
            </div>
          </div>
          </>
          )}

          {/* Tickets Tab */}
          {activeTab === 'tickets' && (
            <>
              <button onClick={() => setActiveTab('profile')} className="back-button">
                ← Back
              </button>
              {ticketsLoading ? (
                <p style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>Loading your tickets...</p>
              ) : tickets && tickets.length > 0 ? (
                <div className="tickets-container">
                  {tickets.map((ticket, idx) => (
                    <div 
                      key={idx} 
                      className="ticket-card"
                      onClick={() => setSelectedTicket(ticket)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="ticket-header">
                        <div className="ticket-pnr">PNR: {ticket.pnr || 'N/A'}</div>
                        <span className={`ticket-status status-${(ticket.bookingStatus || 'CONFIRMED').toLowerCase()}`}>
                          {ticket.bookingStatus || 'CONFIRMED'}
                        </span>
                      </div>
                      
                      <div className="ticket-route">
                        <div className="station">
                          <div className="station-code">{ticket.from}</div>
                          <div className="station-name">From</div>
                        </div>
                        <div className="ticket-arrow">✈</div>
                        <div className="station">
                          <div className="station-code">{ticket.to}</div>
                          <div className="station-name">To</div>
                        </div>
                      </div>

                      <div className="ticket-details-grid">
                        <div className="ticket-detail-item">
                          <div className="ticket-detail-label">Train</div>
                          <div className="ticket-detail-value">{ticket.trainName || 'N/A'}</div>
                        </div>
                        <div className="ticket-detail-item">
                          <div className="ticket-detail-label">Train No.</div>
                          <div className="ticket-detail-value">{ticket.trainNumber || 'N/A'}</div>
                        </div>
                        <div className="ticket-detail-item">
                          <div className="ticket-detail-label">Class</div>
                          <div className="ticket-detail-value">{ticket.travelClass || 'N/A'}</div>
                        </div>
                        <div className="ticket-detail-item">
                          <div className="ticket-detail-label">Departure</div>
                          <div className="ticket-detail-value">{ticket.departureTime || 'N/A'}</div>
                        </div>
                        <div className="ticket-detail-item">
                          <div className="ticket-detail-label">Arrival</div>
                          <div className="ticket-detail-value">{ticket.arrivalTime || 'N/A'}</div>
                        </div>
                        <div className="ticket-detail-item">
                          <div className="ticket-detail-label">Passengers</div>
                          <div className="ticket-detail-value">{ticket.passengers?.length || 0}</div>
                        </div>
                      </div>

                      <div className="ticket-price">
                        Total Cost: ₹{ticket.totalCost?.toFixed(2) || '0.00'}
                      </div>
                      <div style={{ marginTop: '12px', textAlign: 'center', color: '#2563eb', fontSize: '12px', fontWeight: '500' }}>
                        Click to view full ticket details
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-tickets">
                  <p>🎫 No tickets found</p>
                  <p style={{ fontSize: '14px' }}>You haven't booked any tickets yet. Start booking now!</p>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="modal-backdrop">
          <motion.div
            className="modal-card"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <h2>🔐 Change Password</h2>
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {passwordChangeStep === 'request' && (
              <>
                <p>Click below to request an OTP on your registered email.</p>
                <button onClick={handleRequestPasswordChange} className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                  Send OTP to Email
                </button>
                <button
                  onClick={() => { setShowChangePasswordModal(false); setPasswordChangeStep('request'); }}
                  className="btn btn-outline"
                  style={{ width: '100%', marginTop: '8px' }}
                >
                  Cancel
                </button>
              </>
            )}

            {passwordChangeStep === 'otp' && (
              <>
                <p>Enter the 6-digit OTP sent to your email.</p>
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={passwordChangeOtp}
                  onChange={(e) => setPasswordChangeOtp(e.target.value.slice(0, 6))}
                  className="otp-input"
                  style={{ marginTop: '12px' }}
                  maxLength="6"
                />
                <button onClick={handleVerifyPasswordChangeOtp} className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                  Verify OTP
                </button>
                <button
                  onClick={() => setPasswordChangeStep('request')}
                  className="btn btn-outline"
                  style={{ width: '100%', marginTop: '8px' }}
                >
                  Back
                </button>
              </>
            )}

            {passwordChangeStep === 'newpass' && (
              <>
                <p>Enter your new password.</p>
                <input
                  type="password"
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input"
                  style={{ marginTop: '12px' }}
                />
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input"
                  style={{ marginTop: '8px' }}
                />
                <button onClick={handleChangePassword} className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                  Change Password
                </button>
                <button
                  onClick={() => {
                    setShowChangePasswordModal(false);
                    setPasswordChangeStep('request');
                    setPasswordChangeOtp('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="btn btn-outline"
                  style={{ width: '100%', marginTop: '8px' }}
                >
                  Cancel
                </button>
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="modal-backdrop">
          <motion.div
            className="modal-card"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <h2>⚠️ Delete Account</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <p style={{ color: '#dc2626', fontWeight: 'bold', marginBottom: '12px' }}>
              This action cannot be undone. Your account and all data will be permanently deleted.
            </p>
            <input
              type="password"
              placeholder="Enter your password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="input"
              style={{ marginTop: '12px' }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn btn-outline"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="btn btn-danger"
                style={{ flex: 1 }}
              >
                Delete Account
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* OTP Verification Modal (for phone/email changes) */}
      {showVerification && (
        <div className="modal-backdrop">
          <motion.div
            className="modal-card"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <h2>
              {showVerification === 'phone' ? '📱 Verify Phone' : '📧 Verify Email'}
            </h2>
            <p style={{ marginBottom: '12px' }}>
              Enter the OTP sent to your {showVerification}
            </p>

            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              value={verificationOtp}
              onChange={(e) => setVerificationOtp(e.target.value.slice(0, 6))}
              className="otp-input"
              maxLength="6"
            />

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button
                onClick={() => {
                  setShowVerification(null);
                  setVerificationOtp('');
                }}
                className="btn btn-outline"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyOtp}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Verify OTP
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Ticket Slip Modal */}
      {selectedTicket && (
        <TicketSlip 
          ticket={selectedTicket} 
          onClose={() => setSelectedTicket(null)} 
        />
      )}
      <BackButton to="/" label="← Back to Home" />
    </div>
  );
};

export default Profile;
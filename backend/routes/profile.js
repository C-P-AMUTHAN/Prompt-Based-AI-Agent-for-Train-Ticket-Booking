const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  requestPhoneChange,
  verifyPhoneChange,
  requestEmailChange,
  verifyEmailChange,
  changePassword,
  deleteAccount,
  requestPasswordChange,
  verifyPasswordChange
} = require('../controllers/profileController');

/**
 * Profile Routes
 * All routes require user to be authenticated
 */

// Get user profile
router.get('/:userId', getUserProfile);

// Update user profile
router.put('/:userId', updateUserProfile);

// Change phone number
router.post('/:userId/change-phone', requestPhoneChange);
router.post('/:userId/verify-phone-change', verifyPhoneChange);

// Change email
router.post('/:userId/change-email', requestEmailChange);
router.post('/:userId/verify-email-change', verifyEmailChange);

// Change password (with OTP verification)
router.post('/:userId/request-password-change', requestPasswordChange);
router.post('/:userId/verify-password-change', verifyPasswordChange);

// Legacy password change (still available)
router.post('/:userId/change-password', changePassword);

// Delete account
router.post('/:userId/delete-account', deleteAccount);

module.exports = router;

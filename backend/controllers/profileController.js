const User = require('../models/User');
const otpService = require('../services/otpService');
const bcrypt = require('bcryptjs');

/**
 * Get user profile
 * @route GET /api/profile/:userId
 */
exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('-password -emailOtp -phoneOtp');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        age: user.age,
        gender: user.gender,
        phone: user.phone,
        address: user.address,
        aadharNumber: user.aadharNumber,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
};

/**
 * Update user profile
 * @route PUT /api/profile/:userId
 */
exports.updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, age, gender, address, aadharNumber } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update profile fields
    if (name) user.name = name;
    if (age) user.age = age;
    if (gender) user.gender = gender;
    if (address) user.address = address;
    if (aadharNumber) user.aadharNumber = aadharNumber;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        age: user.age,
        gender: user.gender,
        phone: user.phone,
        address: user.address,
        aadharNumber: user.aadharNumber,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
};

/**
 * Request phone number change with OTP verification
 * @route POST /api/profile/:userId/change-phone
 */
exports.requestPhoneChange = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPhone } = req.body;

    if (!newPhone) {
      return res.status(400).json({ message: 'New phone number is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate OTP for phone verification
    const otp = otpService.generateOtp();
    const otpExpiry = otpService.getOtpExpiry();

    // Store OTP temporarily (we'll use a temp field)
    user.phoneOtp = otp;
    user.phoneOtpExpiry = otpExpiry;
    user.phoneOtpAttempts = 0;
    
    // Store new phone in a temp field for verification
    user.tempPhone = newPhone;
    
    await user.save();

    // Send OTP to new phone
    await otpService.sendPhoneOtp(newPhone, otp);

    res.json({
      success: true,
      message: 'OTP sent to your new phone number',
      requiresVerification: true,
      phone: newPhone
    });
  } catch (error) {
    res.status(500).json({ message: 'Error requesting phone change', error: error.message });
  }
};

/**
 * Verify phone change OTP
 * @route POST /api/profile/:userId/verify-phone-change
 */
exports.verifyPhoneChange = async (req, res) => {
  try {
    const { userId } = req.params;
    const { otp } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check attempts
    if (user.phoneOtpAttempts >= 5) {
      return res.status(400).json({ message: 'Too many failed attempts. Request a new OTP.' });
    }

    // Verify OTP
    otpService.verifyOtp(otp, user.phoneOtp, user.phoneOtpExpiry);

    // Update phone number
    if (user.tempPhone) {
      user.phone = user.tempPhone;
      user.tempPhone = null;
      user.phoneVerified = true;
    }

    user.phoneOtp = null;
    user.phoneOtpExpiry = null;
    user.phoneOtpAttempts = 0;
    await user.save();

    res.json({
      success: true,
      message: 'Phone number updated successfully',
      user: {
        id: user._id,
        phone: user.phone,
        phoneVerified: true
      }
    });
  } catch (error) {
    const user = await User.findById(req.params.userId);
    if (user) {
      user.phoneOtpAttempts += 1;
      await user.save();
    }
    res.status(400).json({ message: error.message });
  }
};

/**
 * Request email change with OTP verification
 * @route POST /api/profile/:userId/change-email
 */
exports.requestEmailChange = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newEmail } = req.body;

    if (!newEmail) {
      return res.status(400).json({ message: 'New email is required' });
    }

    // Check if new email is already taken
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser && existingUser._id.toString() !== userId) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate OTP for email verification
    const otp = otpService.generateOtp();
    const otpExpiry = otpService.getOtpExpiry();

    // Store OTP temporarily
    user.emailOtp = otp;
    user.emailOtpExpiry = otpExpiry;
    user.emailOtpAttempts = 0;
    
    // Store new email in a temp field
    user.tempEmail = newEmail;
    
    await user.save();

    // Send OTP to new email
    await otpService.sendEmailOtp(newEmail, otp, user.name);

    res.json({
      success: true,
      message: 'OTP sent to your new email address',
      requiresVerification: true,
      email: newEmail
    });
  } catch (error) {
    res.status(500).json({ message: 'Error requesting email change', error: error.message });
  }
};

/**
 * Verify email change OTP
 * @route POST /api/profile/:userId/verify-email-change
 */
exports.verifyEmailChange = async (req, res) => {
  try {
    const { userId } = req.params;
    const { otp } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check attempts
    if (user.emailOtpAttempts >= 5) {
      return res.status(400).json({ message: 'Too many failed attempts. Request a new OTP.' });
    }

    // Verify OTP
    otpService.verifyOtp(otp, user.emailOtp, user.emailOtpExpiry);

    // Update email
    if (user.tempEmail) {
      user.email = user.tempEmail;
      user.tempEmail = null;
      user.emailVerified = true;
    }

    user.emailOtp = null;
    user.emailOtpExpiry = null;
    user.emailOtpAttempts = 0;
    await user.save();

    res.json({
      success: true,
      message: 'Email updated successfully',
      user: {
        id: user._id,
        email: user.email,
        emailVerified: true
      }
    });
  } catch (error) {
    const user = await User.findById(req.params.userId);
    if (user) {
      user.emailOtpAttempts += 1;
      await user.save();
    }
    res.status(400).json({ message: error.message });
  }
};

/**
 * Change password
 * @route POST /api/profile/:userId/change-password
 */
exports.changePassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error changing password', error: error.message });
  }
};

/**
 * Delete account
 * @route DELETE /api/profile/:userId
 */
exports.deleteAccount = async (req, res) => {
  try {
    const { userId } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required to delete account' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: 'Password is incorrect' });
    }

    // Delete user
    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting account', error: error.message });
  }
};

/**
 * Request password change OTP (sends OTP to registered email)
 * @route POST /api/profile/:userId/request-password-change
 */
exports.requestPasswordChange = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.emailVerified) {
      return res.status(400).json({ message: 'Please verify your email first' });
    }

    // Generate OTP for password change
    const otp = otpService.generateOtp();
    const otpExpiry = otpService.getOtpExpiry();

    user.passwordChangeOtp = otp;
    user.passwordChangeOtpExpiry = otpExpiry;
    user.passwordChangeOtpAttempts = 0;
    await user.save();

    // Send OTP to email
    await otpService.sendEmailOtp(user.email, otp, user.name);

    res.json({
      success: true,
      message: 'OTP sent to your registered email. Check your inbox.'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error requesting password change', error: error.message });
  }
};

/**
 * Verify password change OTP and change password
 * @route POST /api/profile/:userId/verify-password-change
 */
exports.verifyPasswordChange = async (req, res) => {
  try {
    const { userId } = req.params;
    const { otp, newPassword } = req.body;

    if (!otp || !newPassword) {
      return res.status(400).json({ message: 'OTP and new password are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check attempts
    if (user.passwordChangeOtpAttempts >= 5) {
      return res.status(400).json({ message: 'Too many failed attempts. Request a new OTP.' });
    }

    // Verify OTP
    otpService.verifyOtp(otp, user.passwordChangeOtp, user.passwordChangeOtpExpiry);

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    user.password = hashedPassword;
    user.passwordChangeOtp = null;
    user.passwordChangeOtpExpiry = null;
    user.passwordChangeOtpAttempts = 0;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    const user = await User.findById(req.params.userId);
    if (user) {
      user.passwordChangeOtpAttempts += 1;
      await user.save();
    }
    res.status(400).json({ message: error.message });
  }
};

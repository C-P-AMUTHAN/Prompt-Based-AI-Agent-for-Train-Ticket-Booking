const User = require('../models/User'); // note capital 'U'
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const otpService = require('../services/otpService');

// ✅ User signup with OTP verification
exports.signup = async (req, res) => {
  const { name, email, password, phone } = req.body;
  try {
    const userExist = await User.findOne({ email });
    if (userExist) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user but don't verify yet
    const newUser = await User.create({ 
      name, 
      email, 
      password: hashedPassword,
      phone: phone || null,
      emailVerified: false,
      phoneVerified: false
    });

    // Generate and send email OTP
    const emailOtp = otpService.generateOtp();
    const otpExpiry = otpService.getOtpExpiry();
    
    newUser.emailOtp = emailOtp;
    newUser.emailOtpExpiry = otpExpiry;
    newUser.emailOtpAttempts = 0;
    // Mark phone as verified by default (no phone OTP needed)
    newUser.phoneVerified = true;
    await newUser.save();

    // Send OTP to email only
    await otpService.sendEmailOtp(email, emailOtp, name);

    res.status(201).json({ 
      success: true,
      message: 'Signup successful. Please verify your email',
      userId: newUser._id,
      email: newUser.email,
      phone: newUser.phone || null,
      requiresEmailVerification: true,
      requiresPhoneVerification: false
    });
  } catch (error) {
    res.status(500).json({ message: 'Signup failed', error: error.message });
  }
};

// ✅ Verify Email OTP
exports.verifyEmailOtp = async (req, res) => {
  const { userId, otp } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check attempts
    if (user.emailOtpAttempts >= 5) {
      return res.status(400).json({ message: 'Too many failed attempts. Request a new OTP.' });
    }

    // Verify OTP
    otpService.verifyOtp(otp, user.emailOtp, user.emailOtpExpiry);

    // Mark email as verified
    user.emailVerified = true;
    user.emailOtp = null;
    user.emailOtpExpiry = null;
    user.emailOtpAttempts = 0;
    await user.save();

    // Generate token immediately after email verification (no phone verification needed)
    const token = jwt.sign({ id: user._id, role: 'user' }, process.env.JWT_SECRET, {
      expiresIn: '3d',
    });
    return res.json({ 
      success: true,
      message: 'Email verified successfully. Registration complete!', 
      token, 
      user: { id: user._id, name: user.name, email: user.email, role: 'user' }
    });
  } catch (error) {
    const user = await User.findById(req.body.userId);
    if (user) {
      user.emailOtpAttempts += 1;
      await user.save();
    }
    res.status(400).json({ message: error.message });
  }
};

// ✅ Phone OTP verification removed - phone verification no longer needed

// ✅ Resend OTP (email only)
exports.resendOtp = async (req, res) => {
  const { userId, type } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (type !== 'email') {
      return res.status(400).json({ message: 'Only email OTP resend is supported' });
    }

    const otp = otpService.generateOtp();
    const otpExpiry = otpService.getOtpExpiry();

    user.emailOtp = otp;
    user.emailOtpExpiry = otpExpiry;
    user.emailOtpAttempts = 0;
    await otpService.sendEmailOtp(user.email, otp, user.name);

    await user.save();
    res.json({ success: true, message: 'OTP resent to email' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ User signin
exports.signin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid password' });

    // Check if user is verified
    if (!user.emailVerified) {
      return res.status(400).json({ 
        message: 'Please verify your email first',
        userId: user._id,
        requiresEmailVerification: true
      });
    }

    const token = jwt.sign({ id: user._id, role: 'user' }, process.env.JWT_SECRET, {
      expiresIn: '3d',
    });

    res.status(200).json({ 
      token, 
      user: { 
        _id: user._id,
        id: user._id, 
        name: user.name, 
        email: user.email,
        phone: user.phone,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        role: 'user' 
      } 
    });
  } catch (error) {
    res.status(500).json({ message: 'Signin failed', error: error.message });
  }
};

// ✅ Admin signin (predefined credentials)
exports.adminSignin = async (req, res) => {
  const { email, password } = req.body;

  // Predefined in .env
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPass = process.env.ADMIN_PASSWORD;

  if (email !== adminEmail || password !== adminPass) {
    return res.status(401).json({ message: 'Invalid admin credentials' });
  }

  const token = jwt.sign({ id: 'admin', role: 'admin' }, process.env.JWT_SECRET, {
    expiresIn: '3d',
  });

  res.status(200).json({ token, user: { id: 'admin', name: 'Admin', role: 'admin' } });
};

// ✅ Current user fetch (for /api/auth/me endpoint)
exports.getCurrentUser = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role === 'admin') {
      return res.json({ 
        id: 'admin', 
        name: 'Admin', 
        email: process.env.ADMIN_EMAIL, 
        role: 'admin' 
      });
    }

    const user = await User.findById(decoded.id).select('-password -emailOtp -phoneOtp -emailOtpExpiry');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      success: true,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        age: user.age,
        gender: user.gender,
        address: user.address,
        emailVerified: user.emailVerified,
        role: 'user'
      }
    });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token', error: err.message });
  }
};

// ✅ Forgot password - send OTP to registered email
exports.forgotPasswordOtp = async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found with this email' });
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
      message: 'OTP sent to your registered email',
      userId: user._id
    });
  } catch (error) {
    res.status(500).json({ message: 'Error sending OTP', error: error.message });
  }
};

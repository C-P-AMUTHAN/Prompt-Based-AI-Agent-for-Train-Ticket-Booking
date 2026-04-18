const express = require('express');
const router = express.Router();
const { 
  signup, 
  signin, 
  adminSignin, 
  getCurrentUser,
  verifyEmailOtp,
  resendOtp,
  forgotPasswordOtp
} = require('../controllers/authController');

router.post('/signup', signup);                    // user signup
router.post('/signup/verify-email', verifyEmailOtp); // verify email OTP
router.post('/signup/resend-otp', resendOtp);    // resend OTP
router.post('/signin', signin);                    // user signin
router.post('/admin/signin', adminSignin);       // admin signin
router.get('/me', getCurrentUser);               // get current user
router.post('/forgot-password-otp', forgotPasswordOtp); // send OTP for password reset
module.exports = router;

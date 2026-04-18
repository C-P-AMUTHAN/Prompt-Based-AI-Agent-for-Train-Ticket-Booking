const nodemailer = require('nodemailer');

/**
 * OTP Service - Handles generation and sending of OTPs
 * Used for email and phone verification
 */

// Generate a random 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Get OTP expiry time (valid for 10 minutes)
function getOtpExpiry() {
  return new Date(Date.now() + 10 * 60 * 1000);
}

/**
 * Send OTP to Email
 * @param {string} email - Recipient email
 * @param {string} otp - OTP to send
 * @param {string} name - User's name
 * @returns {Promise}
 */
async function sendEmailOtp(email, otp, name = 'User') {
  try {
    // Create transporter
    let transporter;
    
    // Check for SMTP configuration in .env
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      console.log('📧 Using Gmail SMTP configuration...');
      console.log('📧 SMTP User:', process.env.SMTP_USER);
      console.log('📧 SMTP Host:', process.env.SMTP_HOST);
      console.log('📧 SMTP Port:', process.env.SMTP_PORT);
      
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true' || false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        logger: true,
        debug: true,
      });

      // Verify connection before sending
      transporter.verify((error, success) => {
        if (error) {
          console.error('❌ SMTP Connection Error:', error.message);
          console.log('🔴 Gmail authentication failed. Check:');
          console.log('   1. App Password is correct (not regular password)');
          console.log('   2. 2-Factor Authentication is enabled');
          console.log('   3. Less Secure App Access is disabled');
        } else {
          console.log('✅ SMTP Connection Verified Successfully!');
        }
      });
    } 
    // Fall back to EMAIL_USER and EMAIL_PASS if configured
    else if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      console.log('📧 Using Gmail configuration...');
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    } 
    // Last resort: Ethereal test account (for development only)
    else {
      console.log('🧪 No Gmail config found. Using Ethereal test account for development...');
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('🧪 Ethereal Credentials:', { user: testAccount.user, pass: testAccount.pass });
    }

    // Email content
    const mailOptions = {
      from: process.env.SMTP_USER || process.env.EMAIL_USER || 'noreply@railwaytickets.com',
      to: email,
      subject: '🔐 Email Verification OTP - Railway Ticket Booking',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .otp-box { 
              background: white; 
              border: 2px solid #4f46e5; 
              padding: 20px; 
              text-align: center; 
              border-radius: 8px;
              margin: 20px 0;
            }
            .otp-code { 
              font-size: 36px; 
              font-weight: bold; 
              color: #4f46e5; 
              letter-spacing: 5px;
              font-family: 'Courier New', monospace;
            }
            .expiry { color: #6b7280; font-size: 14px; margin-top: 10px; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 15px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚂 Railway Ticket Booking</h1>
              <p>Email Verification</p>
            </div>
            <div class="content">
              <p>Hello ${name},</p>
              <p>Thank you for registering with Railway Ticket Booking. To verify your email address and proceed with booking, please use the OTP below:</p>
              
              <div class="otp-box">
                <div class="otp-code">${otp}</div>
                <div class="expiry">Valid for 10 minutes</div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> Never share this OTP with anyone. Our team will never ask for your OTP.
              </div>
              
              <p style="color: #6b7280; font-size: 14px;">
                If you didn't request this verification, please ignore this email.
              </p>
              
              <p>Best regards,<br><strong>Railway Ticket Booking Team</strong></p>
            </div>
            <div class="footer">
              <p>&copy; 2026 Railway Ticket Booking. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    // Send email
    try {
      const info = await transporter.sendMail(mailOptions);
      
      console.log('✅ OTP email sent successfully to:', email);
      console.log('📧 Message ID:', info.messageId);
      
      // For Ethereal test account, log the preview URL
      if (!process.env.SMTP_USER) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('🧪 Preview URL:', previewUrl);
        console.log('📧 Check this URL to see the OTP email');
      }
      
      return { success: true, message: 'OTP sent to email', previewUrl: !process.env.SMTP_USER ? nodemailer.getTestMessageUrl(info) : null };
    } catch (smtpError) {
      console.error('❌ SMTP Error Details:', {
        code: smtpError.code,
        message: smtpError.message,
        response: smtpError.response,
        command: smtpError.command
      });
      
      if (smtpError.code === 'EAUTH') {
        console.log('🔴 AUTHENTICATION FAILED. This usually means:');
        console.log('   1. Gmail App Password is INCORRECT');
        console.log('   2. You\'re using regular Gmail password instead of App Password');
        console.log('   3. 2-Factor Authentication is not enabled');
        throw new Error('Gmail authentication failed. Use an App Password, not your regular password.');
      }
      
      throw new Error('Failed to send OTP email: ' + smtpError.message);
    }
  } catch (error) {
    console.error('❌ Error sending OTP email:', error.message);
    throw new Error('Failed to send OTP email: ' + error.message);
  }
}

/**
 * Send OTP to Phone via SMS
 * @param {string} phone - Phone number
 * @param {string} otp - OTP to send
 * @returns {Promise}
 */
async function sendPhoneOtp(phone, otp) {
  try {
    // Check if Twilio is configured
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      console.log('📱 Using Twilio SMS service...');
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const client = require('twilio')(accountSid, authToken);
      
      try {
        const message = await client.messages.create({
          body: `Your Railway Ticket Booking OTP is: ${otp}. Valid for 10 minutes. Do not share this OTP.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone
        });
        
        console.log('✅ SMS OTP sent successfully to:', phone);
        console.log('📱 Twilio Message ID:', message.sid);
        return { success: true, message: 'OTP sent to phone via SMS', messageId: message.sid };
      } catch (twilioError) {
        console.error('❌ Twilio Error:', twilioError.message);
        throw new Error('Failed to send SMS: ' + twilioError.message);
      }
    } 
    // Fallback: Display OTP in console for testing (development only)
    else {
      console.log('\n' + '='.repeat(70));
      console.log('📱 SMS OTP TEST MODE (Twilio not configured)');
      console.log('📱 Phone Number: ' + phone);
      console.log('🔐 OTP CODE: ' + otp);
      console.log('⏱️  Valid for 10 minutes');
      console.log('⚠️  To enable real SMS: Add TWILIO credentials to .env');
      console.log('='.repeat(70) + '\n');
      
      console.warn(`\n🚨 [SMS OTP] Phone: ${phone} | Code: ${otp} | Expires: ${new Date(Date.now() + 10 * 60 * 1000).toLocaleTimeString()}\n`);
      
      return { success: true, message: 'OTP sent to phone (check server logs - Twilio not configured)', otp };
    }
  } catch (error) {
    console.error('❌ Error sending phone OTP:', error.message);
    throw new Error('Failed to send OTP to phone: ' + error.message);
  }
}

/**
 * Verify OTP
 * @param {string} userOtp - OTP provided by user
 * @param {string} storedOtp - OTP stored in database
 * @param {Date} otpExpiry - OTP expiry time
 * @returns {boolean}
 */
function verifyOtp(userOtp, storedOtp, otpExpiry) {
  // Check if OTP is expired
  if (new Date() > otpExpiry) {
    throw new Error('OTP has expired. Please request a new one.');
  }

  // Check if OTP matches
  if (userOtp !== storedOtp) {
    throw new Error('Invalid OTP. Please try again.');
  }

  return true;
}

module.exports = {
  generateOtp,
  getOtpExpiry,
  sendEmailOtp,
  sendPhoneOtp,
  verifyOtp,
};

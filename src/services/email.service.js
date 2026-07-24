const nodemailer = require("nodemailer");
const ApiError = require("../utils/apiError");

/**
 * Reusable Nodemailer transporter, configured from environment variables.
 * Works with any SMTP provider (Gmail, SendGrid, Mailtrap, AWS SES, etc).
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465, // true for port 465, false for others
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Returns subject + HTML body for the given OTP purpose.
 * Only two purposes exist now that password-based flows are gone:
 * "registration" (verifying a new account) and "login" (passwordless sign-in).
 */
const buildOtpTemplate = (otp, purpose) => {
  const expiryMinutes = process.env.OTP_EXPIRY_MINUTES || 5;

  const templates = {
    registration: {
      subject: "Verify your account - Klyra Jewellery",
      heading: "Verify your account",
      message: "Use the OTP below to verify your email and activate your Klyra Jewellery account.",
    },
    login: {
      subject: "Your login OTP - Klyra Jewellery",
      heading: "Log in to Klyra Jewellery",
      message: "Use the OTP below to log in to your Klyra Jewellery account.",
    },
  };

  const template = templates[purpose] || templates.registration;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #1a1a1a;">Klyra Jewellery</h2>
      <h3 style="color: #333;">${template.heading}</h3>
      <p style="color: #555;">${template.message}</p>
      <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; background: #f5f5f5; padding: 16px; text-align: center; border-radius: 6px; margin: 16px 0;">
        ${otp}
      </div>
      <p style="color: #999; font-size: 13px;">
        This OTP will expire in ${expiryMinutes} minutes. If you did not request this, please ignore this email.
      </p>
    </div>
  `;

  return { subject: template.subject, html };
};

/**
 * Sends an OTP email to the given address for the given purpose
 * ("registration" | "login").
 */
const sendOtpEmail = async (toEmail, otp, purpose = "registration") => {
  try {
    const { subject, html } = buildOtpTemplate(otp, purpose);

    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"Klyra Jewellery" <no-reply@klyra.com>`,
      to: toEmail,
      subject,
      html,
    });
  } catch (error) {
    console.error("Failed to send OTP email:", error.message);
    throw new ApiError(500, "Failed to send OTP email. Please try again later.");
  }
};
module.exports = { sendOtpEmail };

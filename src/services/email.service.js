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

/**
 * Builds subject + HTML invoice body for a confirmed order.
 * Uses the exact field names from order.model.js — items[].name/quantity/priceAtOrderTime,
 * pricing.{subtotal,couponDiscount,shippingCharge,totalAmount}, shippingAddress.*
 */
const buildOrderInvoiceTemplate = (order) => {
  const itemsRows = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}${item.size ? ` (Size ${item.size})` : ""}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${item.priceAtOrderTime}</td>
        </tr>`
    )
    .join("");

  const { subtotal, couponDiscount, shippingCharge, totalAmount } = order.pricing;
  const addr = order.shippingAddress;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #1a1a1a;">Klyra Jewellery</h2>
      <h3 style="color: #333;">Order Confirmed — ${order.orderNumber}</h3>
      <p style="color: #555;">Thank you for your order! Here's your invoice.</p>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr>
            <th style="text-align: left; padding: 8px; border-bottom: 2px solid #333;">Item</th>
            <th style="text-align: center; padding: 8px; border-bottom: 2px solid #333;">Qty</th>
            <th style="text-align: right; padding: 8px; border-bottom: 2px solid #333;">Price</th>
          </tr>
        </thead>
        <tbody>${itemsRows}</tbody>
      </table>

      <table style="width: 100%; margin: 16px 0; font-size: 14px;">
        <tr><td style="color: #555;">Subtotal</td><td style="text-align: right;">₹${subtotal}</td></tr>
        ${couponDiscount ? `<tr><td style="color: #555;">Coupon Discount</td><td style="text-align: right;">-₹${couponDiscount}</td></tr>` : ""}
        <tr><td style="color: #555;">Shipping</td><td style="text-align: right;">${shippingCharge === 0 ? "Free" : `₹${shippingCharge}`}</td></tr>
        <tr><td style="font-weight: bold; padding-top: 8px;">Total</td><td style="text-align: right; font-weight: bold; padding-top: 8px;">₹${totalAmount}</td></tr>
      </table>

      <p style="color: #555; margin-top: 24px;"><b>Payment Method:</b> ${order.paymentMethod.toUpperCase()}</p>

      <p style="color: #555; margin-top: 16px;"><b>Delivery Address:</b><br/>
        ${addr.fullName}<br/>
        ${addr.addressLine1}${addr.addressLine2 ? `, ${addr.addressLine2}` : ""}<br/>
        ${addr.city}, ${addr.state} - ${addr.pincode}<br/>
        Phone: ${addr.phoneNumber}
      </p>

      <p style="color: #999; font-size: 13px; margin-top: 24px;">
        We'll notify you again once your order ships.
      </p>
    </div>
  `;

  return { subject: `Your Klyra order ${order.orderNumber} is confirmed`, html };
};

/**
 * Sends an order confirmation/invoice email to the given address.
 * Failure here should never block the order-placed response — caller
 * should wrap this in try/catch and just log on failure.
 */
const sendOrderConfirmationEmail = async (toEmail, order) => {
  try {
    const { subject, html } = buildOrderInvoiceTemplate(order);

    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"Klyra Jewellery" <no-reply@klyra.com>`,
      to: toEmail,
      subject,
      html,
    });
  } catch (error) {
    console.error("Failed to send order confirmation email:", error.message);
    throw new ApiError(500, "Failed to send order confirmation email.");
  }
};

module.exports = { sendOtpEmail, sendOrderConfirmationEmail };
const crypto = require("crypto");
const razorpayInstance = require("../config/razorpay.config");

// Razorpay ke saath ek "order" create karna (yeh Aabharan ke Order se alag hai —
// yeh sirf Razorpay ke apne system ke andar ek payment session hai)
const createRazorpayOrder = async (amount, receiptId) => {
  const options = {
    amount: Math.round(amount * 100), // Razorpay paise mein leta hai, rupee mein nahi (₹500 => 50000)
    currency: "INR",
    receipt: receiptId,
  };

  const razorpayOrder = await razorpayInstance.orders.create(options);
  return razorpayOrder;
};

// Payment success hone ke baad, frontend se aaye signature ko verify karna
// (yeh confirm karta hai ki response genuinely Razorpay se aaya hai, tampered nahi hai)
const verifyPaymentSignature = ({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  return generatedSignature === razorpaySignature;
};

// Refund process karna (poora ya partial amount)
const initiateRefund = async (razorpayPaymentId, amount, reason) => {
  const refund = await razorpayInstance.payments.refund(razorpayPaymentId, {
    amount: Math.round(amount * 100), // paise mein
    notes: { reason },
  });

  return refund;
};

module.exports = { createRazorpayOrder, verifyPaymentSignature, initiateRefund };
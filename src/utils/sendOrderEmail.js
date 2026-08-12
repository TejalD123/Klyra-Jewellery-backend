// utils/sendOrderEmail.js
const transporter = require("../config/mailer"); // your existing nodemailer transporter

const sendOrderConfirmationEmail = async (order, user) => {
  const itemsHtml = order.items
    .map(
      (i) => `<tr>
        <td>${i.product.name}</td>
        <td>${i.quantity}</td>
        <td>₹${i.lineTotal}</td>
      </tr>`
    )
    .join("");

  const html = `
    <h2>Order Confirmed — #${order._id}</h2>
    <p>Hi ${user.fullName}, thanks for your order!</p>
    <table border="1" cellpadding="8" style="border-collapse:collapse">
      <tr><th>Item</th><th>Qty</th><th>Price</th></tr>
      ${itemsHtml}
      <tr><td colspan="2"><b>Total</b></td><td><b>₹${order.totalAmount}</b></td></tr>
    </table>
    <p>Delivery to: ${order.shippingAddress.addressLine1}, ${order.shippingAddress.city}</p>
  `;

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: user.email,
    subject: `Your Klyra order #${order._id} is confirmed`,
    html,
  });
};

module.exports = sendOrderConfirmationEmail;
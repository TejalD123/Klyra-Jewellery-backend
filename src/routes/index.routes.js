const express = require("express");
const router = express.Router();

// Jaise jaise aap har module ke routes banate jaoge, unhe yaha register karte jana.
// Abhi ke liye commented rakha hai — jo file bani ho uska comment hata dena.

 
const categoryRoutes = require("./category.routes.js");
const productRoutes = require("./product.routes.js");
const addressRoutes = require("./address.routes.js");
const cartRoutes = require("./cart.routes.js");
const orderRoutes = require("./order.routes.js");
const authRoutes = require("./auth.routes.js");
const userRoutes = require("./user.routes.js");
const adminOrderRoutes = require("./admin.routes.js");

 
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/addresses", addressRoutes);
router.use("/cart", cartRoutes);
router.use("/orders", orderRoutes);
router.use("/admin/orders", adminOrderRoutes);
router.use("/otp", require("./otp.routes.js"));
router.use("/payments", require("./payment.routes.js"));



router.get("/health", (req, res) => {
  res.status(200).json({ success: true, message: "API is running" });
});

module.exports = router;
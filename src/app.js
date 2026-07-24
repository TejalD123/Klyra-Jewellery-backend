const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const mainRoutes = require("./routes/index.routes.js");
const { errorHandler, notFound } = require("./middleware/error.middleware");

const app = express();

// ===== SECURITY & PARSING MIDDLEWARE =====
app.use(helmet()); // security headers (XSS, clickjacking, etc se basic protection)
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173", // React frontend ka URL
    credentials: true, // cookies/auth headers allow karne ke liye
  })
);
app.use(express.json({ limit: "10mb" })); // JSON body parse karna (image base64 ke liye limit badhaya)
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ===== LOGGING (development mein har request console pe dikhega) =====
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ===== ROUTES =====
app.use("/api/v1", mainRoutes);

// Root route — sirf check karne ke liye ki server zinda hai
app.get("/", (req, res) => {
  res.send("Klyra server is running");
});

// ===== ERROR HANDLING (hamesha SABSE LAST mein aana chahiye) =====
app.use(notFound);
app.use(errorHandler);

module.exports = app;
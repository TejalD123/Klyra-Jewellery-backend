const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1); // stop server agar DB connect na ho
  }
};

// connection ke baad kabhi bhi disconnect ho jaye to log dikhega
mongoose.connection.on("disconnected", () => {
  console.warn("⚠️  MongoDB disconnected");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB Error:", err.message);
});

module.exports = connectDB;
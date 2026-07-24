// Environment variables sabse pehle load honi chahiye, kisi aur file se pehle
require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db.config");
require("./config/redis.config"); // isse import karte hi Redis connect hone ki koshish karega

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Pehle database connect karo, tabhi server start karo
    await connectDB();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📦 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error(`❌ Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

// Agar kahin unhandled promise rejection ho (jaise koi async error miss ho gaya)
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("SIGTERM", () => {
  console.log("Shutting down gracefully...");
  process.exit(0);
});
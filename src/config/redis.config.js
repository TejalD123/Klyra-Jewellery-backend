const Redis = require("ioredis");

// Local Redis ke liye: REDIS_HOST=127.0.0.1, REDIS_PORT=6379, password khali rakho
// Redis Cloud/Upstash (production) ke liye: unke diye hue host/port/password use karo

const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
});

redis.on("connect", () => {
  console.log("✅ Redis Connected");
});

redis.on("error", (err) => {
  console.error(`❌ Redis Error: ${err.message}`);
});

redis.on("ready", () => {
  console.log("Redis is ready to accept commands");
});
module.exports = redis;
const mongoose = require("mongoose");

/**
 * Generic auto-increment counter, used to generate gap-free sequence
 * numbers (e.g. for order numbers: ORD-2026-00001, ORD-2026-00002, ...).
 * `_id` is the counter's name (e.g. "order-2026"), `seq` is the last
 * value issued.
 */
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model("Counter", counterSchema);

module.exports = Counter;
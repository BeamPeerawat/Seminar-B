const mongoose = require("mongoose");

const contentSchema = new mongoose.Schema({
  title: String,
  description: String,
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Content", contentSchema);

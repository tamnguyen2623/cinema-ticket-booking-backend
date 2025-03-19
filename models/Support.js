const mongoose = require("mongoose");

const SupportSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      required: true,
      enum: ["Technical", "Billing", "General", "Cinema", "Online"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Support", SupportSchema);

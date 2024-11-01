const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.ObjectId, ref: "User" },
    showtime: { type: mongoose.Schema.ObjectId, ref: "Showtime" },
    seats: [
      {
        row: { type: String },
        number: { type: Number },
      },
    ],
    price: Number,
    method: {
      type: String,
      default: "VnPay",
    },
    status: {
      type: String,
      enum: ["done", "pending", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Orders", orderSchema);

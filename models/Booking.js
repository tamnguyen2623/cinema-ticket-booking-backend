const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  showtime: {
    type: String, // Chuyển từ ObjectId -> String
    required: true,
  },
  seats: {
    type: [String],
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 1000,
  },
  status: {
    type: String,
    enum: ["pending", "success", "failed", "cancelled"],
    default: "pending",
  },
  transactionId: {
    type: String,
    unique: true,
    required: true,
  },
  paymentTime: {
    type: Date,
    default: Date.now,
  },
  qrCode: {
    type: String, // Lưu mã QR cho vé
  },
});

module.exports = mongoose.model("Booking", bookingSchema);

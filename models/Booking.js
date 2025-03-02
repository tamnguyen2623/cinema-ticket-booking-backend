const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    movieName: {
      type: String,
      required: true,
    },
    cinema: {
      type: String,
      required: true,
    },
    room: {
      type: String,
      required: true,
    },
    showtime: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    seats: {
      type: [String],
      required: true,
    },
    seatsId: {
      type: [String],
      required: true,
    },
    voucherId: {
      type: String,
      default: null,
    },
    combo: {
      type: [String],
      default: null,
    },
    price: {
      type: Number,
      required: true,
    },
    currency: { type: String, default: "VND" },
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
      default: null,
    },
    qrCode: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);

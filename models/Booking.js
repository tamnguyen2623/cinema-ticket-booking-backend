const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    movieId: {
      type: String,
      required: true,
    },
    movieName: {
      type: String,
      required: true,
    },
    movieImage: {
      type: String,
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
      type: mongoose.Schema.Types.ObjectId,
      ref: "Voucher",
      default: null,
    },
    discount: {
      type: Number,
      default: 0,
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
    isFeedback: {
      type: Boolean,
      default: false
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);

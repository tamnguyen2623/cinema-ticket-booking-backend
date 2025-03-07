const mongoose = require("mongoose");

const seatAvailableSchema = new mongoose.Schema(
  {
    movieShowingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MovieShowing",
    },
    seatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seat",
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SeatAvailable", seatAvailableSchema);
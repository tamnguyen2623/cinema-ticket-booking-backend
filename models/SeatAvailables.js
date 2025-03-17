const mongoose = require("mongoose");

const seatAvailableSchema = new mongoose.Schema(
  {
    movieShowingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MovieShowing",
    },
    name: {
      type: String,
    },
    type: {
      type: String,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SeatAvailable", seatAvailableSchema);
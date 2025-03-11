const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    movieId: { type: mongoose.Schema.Types.ObjectId, ref: "Movie" },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    ratting: { type: Number },
    comment: { type: String },
    date: { type: Date, default: Date.now() },
    isDelete: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Feedback", feedbackSchema);

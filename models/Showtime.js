
const mongoose = require("mongoose");

const showtimeSchema = new mongoose.Schema(
  {
    startTime: {
      type: Date, // Chắc chắn sử dụng Date
      required: [true, "Please add the showtime (date and time)"],
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Showtime", showtimeSchema);

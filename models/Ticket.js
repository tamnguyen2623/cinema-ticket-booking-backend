const mongoose = require("mongoose");

const ticketPriceSchema = new mongoose.Schema({
  roomType: {
    type: String,
    required: true,
  },
  seat: {
    type: mongoose.Schema.ObjectId,
    ref: "Seat",
  },
  room: {
    type: mongoose.Schema.ObjectId,
    ref: "Room",
  },
  seatType: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  isDelete: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});
ticketPriceSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("TicketPrice", ticketPriceSchema);

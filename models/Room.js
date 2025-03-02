const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  cinema: {
    type: mongoose.Schema.ObjectId,
    ref: "Cinema",
  },
  roomname: {
    type: String,
    required: true,
  },
  roomtype: {
    type: String,
    required: true,
  },
  row: {
    type: Number,
    required: true,
  },
  colum: {
    type: Number,
    required: true,
  },
  seats: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "Seat",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: Boolean,
    default: false,
  },
});
roomSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Room", roomSchema);

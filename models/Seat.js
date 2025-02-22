const mongoose = require("mongoose");

const seatSchema = new mongoose.Schema(
  {
    name: { type: String },
    type: { type: String },
    isDelete: { type: Boolean },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Seat", seatSchema);

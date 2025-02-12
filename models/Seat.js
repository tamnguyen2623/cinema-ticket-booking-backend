const mongoose = require("mongoose");
const seatSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
});
const Seat = mongoose.model("Seat", seatSchema);

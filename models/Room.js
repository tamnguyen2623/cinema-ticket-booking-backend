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
  seatnumber: {
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
  status: {
    type: Boolean,
    default: true,
  },
});

roomSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    console.log(`Room ${this._id} is about to be deleted.`);
    try {
      await mongoose.model("Seat").deleteMany({ room: this._id });
      console.log(`All seats for Room ${this._id} have been deleted.`);
      next();
    } catch (err) {
      next(err);
    }
  }
);

module.exports = mongoose.model("Room", roomSchema);

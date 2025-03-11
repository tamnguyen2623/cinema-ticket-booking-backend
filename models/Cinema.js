const mongoose = require("mongoose");

const cinemaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    address: {
      type: String,
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
    phoneNumber: {
      type: String,
    },
    map: {
      type: String,
    },
  },
  { timestamps: true }
);

cinemaSchema.pre(
  "deleteOne",
  { document: true, query: true },
  async function (next) {
    const theaters = await this.model("Theater").find({
      _id: { $in: this.theaters },
    });

    for (const theater of theaters) {
      await theater.deleteOne();
    }
    next();
  }
);

module.exports = mongoose.model("Cinema", cinemaSchema);

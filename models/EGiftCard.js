const mongoose = require("mongoose");

const EGiftSchema = new mongoose.Schema(
  {
    giftNumber: {
      type: Date,
    },
    expirationDate: {
      type: Number,
    },
    balance: {
      type: Number,
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EGift", EGiftSchema);

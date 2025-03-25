const mongoose = require("mongoose");

const EgiftRecipient = new mongoose.Schema(
  {
    fullName: {
      type: String,
    },
    message: {
      type: String,
    },
    email: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EGiftRecipient", EgiftRecipient);
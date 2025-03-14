const mongoose = require("mongoose");

const OwningCardSchema = new mongoose.Schema(
  {
    user: {
     type: mongoose.Schema.ObjectId, ref: "User"
    },
    egift:{
        type: mongoose.Schema.ObjectId, ref: "EGift"
    },
    cardNumber: {
      type: String,
    },
    expiryDate: {
      type: Date,
    },
    balance:{
        type: Number,
    },
    pin: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("OwningCard", OwningCardSchema);

const e = require("express");
const mongoose = require("mongoose");

const OwningCardSchema = new mongoose.Schema(
  {
    user: {
     type: mongoose.Schema.ObjectId, ref: "User"
    },
    egift:{
        type: mongoose.Schema.ObjectId, ref: "EGift"
    },
    egiftRecipient:{
        type: mongoose.Schema.ObjectId, ref: "EGiftRecipient"
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
    status:{
        type: String,
        enum: ["pending", "active", "inactive"],
        default: "pending",
    },
    pin: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("OwningCard", OwningCardSchema);

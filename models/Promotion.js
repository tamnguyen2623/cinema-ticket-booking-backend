const mongoose = require("mongoose");

const promotionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Promotion name is required"],
        unique: true
    }
    ,
    category: {
        type: String,
        enum: ["Hot Promotion", "Gift Movie", "Event Cinema"],
        required: true
    },
    description: {
        type: String,
        required: [true, "Promotion description is required"]
    },
    image: {
        type: String,
        required: [true, "Promotion image is required"]
    },
    dateStart: {
        type: Date,
        require:true,
    },
    dateEnd: {
        type: Date,
        require: true,

    },
    isDelete: {
        type: Boolean,
        default: false
    }}
    ,
  { timestamps: true }
  
);

module.exports = mongoose.model("Promotion", promotionSchema);

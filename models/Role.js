const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema({
    name: {
        type: String,
        // required: [true, "Role name is required"],
        // unique: true
    }
    , 
    isDelete: {
        type: Boolean,
         default: false 
    },
});

module.exports = mongoose.model("Role", roleSchema);

const mongoose = require('mongoose')

const movietypeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add a type name'],
        },
        isDelete: {
            type: Boolean,
            required: [true, 'Please add a status'],
            default: false
        },

    },
    { timestamps: true }
)

module.exports = mongoose.model('MovieType', movietypeSchema)
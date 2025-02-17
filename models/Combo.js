const mongoose = require('mongoose')

const comboSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add a type name'],
        },
        image: {
            type: String,
            required: [true, 'Please add a image'],
        },
        description: {
            type: String,
            required: [true, 'Please add a description'],
        },
        isDelete: {
            type: Boolean,
            required: [true, 'Please add a status'],
            default: false
        },

    },
    { timestamps: true }
)

module.exports = mongoose.model('Combo', comboSchema)
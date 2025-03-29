const mongoose = require('mongoose')

const bannerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
        },
        image: {
            type: String,
        },
        isDelete: {
            type: Boolean,
            default: false
        },

    },
    { timestamps: true }
)

module.exports = mongoose.model('Banner', bannerSchema)
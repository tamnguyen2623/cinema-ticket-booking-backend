const mongoose = require("mongoose");

const ServiceSchema = new mongoose.Schema(
    {
        cinemaName: {
            type: String,
            required: true, // Bắt buộc nhập
        },
        fullName: {
            type: String,
            required: true,
        },
        phoneNumber: {
            type: String,
            required: true,
            match: [/^\d{9,15}$/, "Please add a valid phone number"],
        },
        email: {
            type: String,
            required: [true, "Please add an email"],
            match: [
                /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
                "Please add a valid email",
            ],
        },
        service: {
            type: String,
            required: true,
        },
        information: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Service", ServiceSchema);

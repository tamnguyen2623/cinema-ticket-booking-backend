const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
  },
  fullname: {
    type: String,
    // required: [true, 'Please add a username']
  },
  email: {
    type: String,
    required: [true, "Please add an email"],
    unique: true,
    match: [
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      "Please add a valid email",
    ],
  },
  roleId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Role',
    required: true
  },
  isDelete: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    // required: [true, 'Please add a password'],
    minlength: 6,
    select: false,
  },
  otp: {
    type: String,
  },
  registerCode: {
    type: String,
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  tickets: [
    {
      showtime: { type: mongoose.Schema.ObjectId, ref: "Booking" },
      seats: [
        {
          row: { type: String },
          number: { type: Number },
        },
      ],
      price: Number,
      qr: String,
      ticketId: String,
    },
  ],
  avatar: {
    type: String,
    default: ""
  }, // Trường lưu URL avatar

  favoriteMovies: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Movie"
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});


userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
const User = require("../models/User");
const bcrypt = require("bcryptjs");
require("dotenv").config();

//@desc    Register user
//@route   POST /auth/register
//@access  Public
exports.register = async (req, res, next) => {
  try {
    const { username, email, fullname, password, role = "user" } = req.body;
    let user;
    const foundUserByUsername = await User.findOne({ username: username });
    const foundUserByEmail = await User.findOne({ email: email });
    console.log(foundUserByUsername);
    if (foundUserByUsername != null) {
      res.json({
        success: false,
        message: "Username already exist!",
        code: "10001",
      });
    } else if (foundUserByUsername == null && foundUserByEmail != null) {
      const salt = await bcrypt.genSalt(10);
      const hashPassword = await bcrypt.hash(password, salt);
      user = await User.findOneAndUpdate(
        { email: email },
        {
          $set: { username: username, fullname: fullname, password: hashPassword },
        },
        { new: true, upsert: false }
      );
      sendTokenResponse(user, 200, res);
    } else if (foundUserByEmail != null && !foundUserByUsername != null) {
      user = await User.create({
        username,
        email,
        fullname,
        password,
        role,
      });
      sendTokenResponse(user, 200, res);
    }
  } catch (err) {
    res.status(400).json({ success: false, message: err });
  }
};

exports.countUsers = async (req, res, next) => {
  try{
    const numberOfUsers = await User.count({role: "user"});
    console.log(numberOfUsers)
    res.status(200).json({
      success: true,
      data: numberOfUsers
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err });
  }
}

//@desc		Login user
//@route	POST /auth/login
//@access	Public
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    //Validate email & password
    if (!username || !password) {
      return res.status(400).json("Please provide an username and password");
    }

    //Check for user
    const user = await User.findOne({ username }).select("+password");

    if (!user) {
      return res.status(400).json("Invalid credentials");
    }

    //Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json("Invalid credentials");
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(400).json({ success: false, message: err });
  }
};

//Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  //Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }
  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    token,
  });
};

//@desc		Get current Logged in user
//@route 	POST /auth/me
//@access	Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err });
  }
};

//@desc		Get user's tickets
//@route 	POST /auth/tickets
//@access	Private
exports.getTickets = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id, { tickets: 1 }).populate({
      path: "tickets.showtime",
      populate: [
        "movie",
        {
          path: "theater",
          populate: { path: "cinema", select: "name" },
          select: "cinema number",
        },
      ],
      select: "theater movie showtime isRelease",
    });

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err });
  }
};

//@desc		Log user out / clear cookie
//@route 	GET /auth/logout
//@access	Private
exports.logout = async (req, res, next) => {
  try {
    res.cookie("token", "none", {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });

    res.status(200).json({
      success: true,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err });
  }
};

//@desc		Get All user
//@route 	POST /auth/user
//@access	Private Admin
exports.getAll = async (req, res, next) => {
  try {
    const user = await User.find().populate({
      path: "tickets.showtime",
      populate: [
        "movie",
        {
          path: "theater",
          populate: { path: "cinema", select: "name" },
          select: "cinema number",
        },
      ],
      select: "theater movie showtime isRelease",
    });

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err });
  }
};

//@desc		Delete user
//@route 	DELETE /auth/user/:id
//@access	Private Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(400).json({ success: false });
    }
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err });
  }
};

//@desc     Update user
//@route    PUT /auth/user/:id
//@access   Private
exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: `User not found with id of ${req.params.id}`,
      });
    }
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, message: err });
  }
};

exports.getQROfTicket = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const ticket = user.tickets.find((ticket) => {
      return ticket._id.toString() === req.params.id;
    });
    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }
    res.json({ qr: ticket.qr });
  } catch (err) {
    res.status(400).json({ success: false, message: err });
  }
};

exports.googleCallback = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not authenticated" });
    }

    const token = user.getSignedJwtToken();

    res.cookie("token", token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.redirect("http://localhost:5173/login");
  } catch (error) {
    console.error("Error in Google callback:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

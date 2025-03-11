const { transporter } = require("../config/mailConfig");
const User = require("../models/User");
const Role = require("../models/Role");
const bcrypt = require("bcryptjs");
const multer = require("multer");
require("dotenv").config();
const { uploadMultipleFiles } = require("./fileController");

function generateRandomString() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.getOtpForgetPassword = async (req, res, next) => {
  const { email } = req.body;
  const foundUser = await User.findOne({ email: email });
  if (foundUser == null) {
    res.json({ success: false, code: 1010, message: "User not found!" });
  } else {
    const otp = generateRandomString();
    foundUser.otp = otp;
    await User.findOneAndUpdate(
      { email: email },
      { otp: otp },
      { new: true, upsert: false }
    );
    const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
              <h2 style="background-color: #007bff; color: white; padding: 10px;">You have successfully requested renew password!</h2>
              <p>Dear <strong>${foundUser.fullname}</strong>,</p>
              <p>You have successfully requested renew password. Here is the OTP:</p>
              <p>OTP: ${otp}</p>
              <p style="color: #555;">If you have any question, please contact us.</p>
            </div>`;
    await transporter.sendMail({
      from: '"GROUP01 CI NÊ MA" group01se1709@gmail.com',
      to: foundUser.email,
      subject: "OTP For Forget Password Is Ready!",
      html: emailHtml,
    });

    res.json({ code: 1000 });
  }
};

function generateRandomPassword() {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";
  for (let i = 0; i < 6; i++) {
    password += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }
  return password;
}

exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    console.log("OTP:" + user.otp);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, code: 1012, message: "User not found" });
    }
    if (user.otp !== otp) {
      return res
        .status(400)
        .json({ success: false, code: 1011, message: "Invalid OTP" });
    }
    const randomPassword = generateRandomPassword();
    user.password = randomPassword;
    user.otp = undefined;
    await user.save();
    const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="background-color: #007bff; color: white; padding: 10px;">You have successfully verified the OTP!</h2>
            <p>Dear <strong>${user.fullname}</strong>,</p>
            <p>You have successfully verified the OTP. Here is the new password:</p>
            <p>Username: ${user.username}</p>
            <p>New password: ${randomPassword}</p>
            <p style="color: #555;">If you have any question, please contact us.</p>
          </div>`;
    await transporter.sendMail({
      from: '"GROUP01 CI NÊ MA" group01se1709@gmail.com',
      to: user.email,
      subject: "New Password Is Ready!",
      html: emailHtml,
    });
    res.json({
      success: true,
      code: 1000,
      message: "OTP verified successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword, reEnterPassword } = req.body;
    if (newPassword != reEnterPassword) {
      res.status(400).json({ success: false, code: 1001 });
      return;
    }
    const user = await User.findById(req.user._id).select("+password");
    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      res.status(401).json("Invalid credentials");
      return;
    }
    user.password = newPassword;
    await user.save();
    res.json({ code: 1000, data: user });
  } catch (err) {
    res.status(400).json({ success: false, message: err });
  }
};

exports.changeUsername = async (req, res, next) => {
  try {
    const { newUsername } = req.body;
    if (!req.user || !req.user._id) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: No user found" });
    }
    const user = await User.findById(req.user._id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    const existingUser = await User.findOne({ username: newUsername });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Username already taken" });
    }

    user.username = newUsername;
    await user.save();

    res.json({ success: true, message: "Username updated successfully" });
  } catch (err) {
    console.error("Error updating username:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.register = async (req, res, next) => {
  try {
    console.log(req.body);
    const { username, email, fullname, password } = req.body;
    let user;
    const userRole = await Role.findOne({ name: "user" });
    if (!userRole) {
      return res.status(400).json({ success: false, message: "Role 'user' not found" });
    }

    const foundUserByUsername = await User.findOne({ username: username });
    const foundUserByEmail = await User.findOne({ email: email });
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);
    const otp = generateRandomString();

    if (foundUserByUsername == null && foundUserByEmail == null) {
      user = await User.create({
        username,
        email,
        password,
        fullname,
        roleId: userRole._id,
        otp,
      });
      const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="background-color: #007bff; color: white; padding: 10px;">Welcome to Our Platform!</h2>
        <p>Dear <strong>${fullname}</strong>,</p>
        <p>Thank you for registering. Here is your OTP for verification:</p>
        <p>OTP: <strong>${otp}</strong></p>
        <p style="color: #555;">If you have any questions, please contact us.</p>
      </div>`;

      await transporter.sendMail({
        from: '"GROUP01 CI NÊ MA" <group01se1709@gmail.com>',
        to: email,
        subject: "OTP for Account Verification",
        html: emailHtml,
      });
      sendTokenResponse(user, 200, res);
    } else if (foundUserByUsername != null) {
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
          $set: {
            username: username,
            fullname: fullname,
            password: hashPassword,
            roleId: userRole._id,
          },
        },
        { new: true, upsert: false }
      );
      sendTokenResponse(user, 200, res);
    }
  } catch (err) {
    console.error("Error registering user:", err);
    res.status(400).json({ success: false, message: err });
  }
};

exports.verifyOtpRegister = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found." });
    }

    if (user.isVerified) {
      return res
        .status(400)
        .json({ success: false, message: "Account is already verified." });
    }
    if (user.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP." });
    }
    // Xác thực tài khoản sau khi nhập đúng OTP
    user.isVerified = true;
    await user.save();

    res.json({
      success: true,
      message: "OTP verified successfully. You can now log in.",
    });
  } catch (err) {
    console.error("Error verifying OTP:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found." });
    }
    // Tạo mã OTP mới
    const otp = generateRandomString();
    user.otp = otp;
    await user.save();
    // Gửi lại email với mã OTP mới
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="background-color: #007bff; color: white; padding: 10px;">Resend OTP</h2>
        <p>Dear <strong>${user.fullname}</strong>,</p>
        <p>Your new OTP for verification is:</p>
        <p>OTP: <strong>${otp}</strong></p>
        <p style="color: #555;">If you did not request this, please ignore this email.</p>
      </div>`;

    await transporter.sendMail({
      from: '"GROUP01 CI NÊ MA" <group01se1709@gmail.com>',
      to: email,
      subject: "Your New OTP Code",
      html: emailHtml,
    });

    res.json({ success: true, message: "OTP resent successfully!" });
  } catch (err) {
    console.error("Error resending OTP:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

exports.countUsers = async (req, res, next) => {
  try {
    const numberOfUsers = await User.count({ role: "user" });
    console.log(numberOfUsers);
    res.status(200).json({
      success: true,
      data: numberOfUsers,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err });
  }
};

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json("Please provide an username and password");
    }

    //Check for user
    const user = await User.findOne({ username })
      .select("+password")
      .populate("roleId");

    if (!user) {
      return res.status(400).json("Invalid credentials");
    }
    if (!user.isVerified) {
      return res.status(400).json("Account not verified. Please verify OTP.");
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

const sendTokenResponse = (user, statusCode, res) => {
  //Create token
  const token = user.getSignedJwtToken();
  // Lấy vai trò của user
  const userid = user.id;
  // Cấu hình cookie
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
    role: user.roleId.name,
    userid: userid,
    token,
  });
};

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

    res.redirect(process.env.FRONTEND_PREFIX + "/login");
  } catch (error) {
    console.error("Error in Google callback:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
exports.addUser = async (req, res) => {
  const { username, fullname, password } = req.body;
  try {
    const user = await User.create(username, fullname, password);
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const upload = multer();

exports.uploadAvatar = async (req, res) => {
  upload.single("avatar")(req, res, async function (error) {
    if (error) {
      return res.status(500).json({ success: false, message: "File upload error" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No avatar file provided" });
    }

    try {
      // Upload ảnh lên S3
      const uploadedFile = await uploadMultipleFiles([req.file]);
      // const avatarUrl = uploadedFile["avatar"];
      const avatarUrl = Object.values(uploadedFile)[0]; // Lấy URL đầu tiên từ object

      console.log("Uploaded File:", uploadedFile);

      // Cập nhật avatar của Customer
      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { avatar: avatarUrl },
        { new: true } // Trả về user sau khi cập nhật
      );

      res.json({
        success: true,
        message: "Avatar uploaded successfully",
        avatar: avatarUrl,
        user: updatedUser, // Trả về user sau khi cập nhật
      });

      // customer.avatar = avatarUrl;
      // await customer.save();

      // user.avatar = avatarUrl;
      // await user.markModified("avatar"); // Đánh dấu avatar đã thay đổi
      // await user.save();
      // console.log("Updated Customer:", user);


      // res.status(200).json({ success: true, message: "Avatar uploaded successfully", avatar: avatarUrl });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('roleId');
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err });
  }
};
exports.updateProfile = async (req, res, next) => {
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


exports.googleCallbacks = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not authenticated" });
    }

    if (!user.isVerified) {
      return res.redirect(`${process.env.FRONTEND_PREFIX}/verifyotpregistergoogle?email=${encodeURIComponent(user.email)}`);
    }
    const token = user.getSignedJwtToken();

    res.cookie("token", token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.redirect(process.env.FRONTEND_PREFIX + "/login");
  } catch (error) {
    console.error("Error in Google callback:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.isVerified) {
      return res.status(400).json({ success: false, message: "User is not verified" });
    }

    const token = user.getSignedJwtToken();

    res.cookie("token", token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user
    });
  } catch (error) {
    console.error("Error in Google login:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

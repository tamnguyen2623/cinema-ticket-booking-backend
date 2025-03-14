const nodemailer = require('nodemailer');
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");
const Role = require("../models/Role");

require("dotenv").config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        console.log(profile)
        const userRole = await Role.findOne({ name: "user" });

        let user = await User.findOne({ email });
        if (!user) {
          user = new User({
            email,
            fullname: profile.displayName,
            roleId: userRole._id,
            password: "123456"
          });
          await user.save();
        }
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_ACCOUNT,
    pass: process.env.MAIL_APP_PASSWORD
  }
});

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
passport.use(
  "google-register",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL_REGISTER,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const fullname = profile.displayName;
        const username = profile.displayName;
        const otp = generateOTP();
        const userRole = await Role.findOne({ name: "user" });

        let user = await User.findOne({ email });

        if (!user) {
          user = new User({
            email,
            username,
            fullname,
            roleId: userRole._id,
            otp,
            isVerified: false,
            password: "123456",
          });
          await user.save();
          // Gửi email chứa OTP
          const emailHtml = `
           <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
             <h2 style="background-color: #007bff; color: white; padding: 10px;">Welcome to Our Platform!</h2>
             <p>Dear <strong>${fullname}</strong>,</p>
             <p>Thank you for registering using Google. Here is your OTP for verification:</p>
             <p>OTP: <strong>${otp}</strong></p>
             <p style="color: #555;">If you have any questions, please contact us.</p>
           </div>`;

          await transporter.sendMail({
            from: '"GROUP01 CI NÊ MA" <group01se1709@gmail.com>',
            to: email,
            subject: "OTP for Account Verification",
            html: emailHtml,
          });

        }
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

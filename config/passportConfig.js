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

          // console.log("Preparing to send email...");

          // await transporter.sendMail({
          //   from: '"GROUP01 CI NÊ MA" <group01se1709@gmail.com>',
          //   to: email,
          //   subject: "OTP for Account Verification",
          //   html: `
          //   <div>
          //     <h2>Welcome, ${fullname}!</h2>
          //     <p>Your OTP code: <strong>${otp}</strong></p>
          //   </div>`,
          // });

          // console.log("Email sent successfully!");
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

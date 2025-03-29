const express = require("express");
const passport = require("passport");
require("./config/passportConfig");
const FacebookStrategy = require("passport-facebook").Strategy;
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const mongoose = require("mongoose");
const mongoSanitize = require("express-mongo-sanitize");
const helmet = require("helmet");
const xss = require("xss-clean");
require("dotenv").config();
const User = require("./models/User");
const Role = require("./models/Role");

const auth = require("./routes/auth");
const cinema = require("./routes/cinema");
const theater = require("./routes/theater");
const movie = require("./routes/movie");
const showtime = require("./routes/showtime");
const order = require("./routes/order");
const oauth2 = require("./routes/oauth2");
const room = require("./routes/room");
const seat = require("./routes/seat");
const ticket = require("./routes/ticket");
const voucher = require("./routes/voucher");
const movieshowing = require("./routes/movieShowTime");
const movietype = require("./routes/movietype");
const combo = require("./routes/combo");
const booking = require("./routes/booking");
const seatAvailable = require("./routes/seatAvailable");
const role = require("./routes/role");
const feedback = require("./routes/feedback");
const revenue = require("./routes/revenue");
const user = require("./routes/user");
const egift = require("./routes/egift");
const support = require("./routes/support");
const promotion = require("./routes/promotion")

const banner = require("./routes/banner");
const service = require("./routes/service");
const favoriteMovie = require("./routes/favorite")

mongoose.set("strictQuery", false);
mongoose
  .connect(process.env.DATABASE)
  .then(() => {
    console.log("mongoose connected!");
  })
  .catch((err) => console.log(err));

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.FRONTEND_PREFIX,
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(mongoSanitize());
app.use(helmet());
app.use(xss());

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_KEY,
      clientSecret: process.env.FACEBOOK_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL,
      profileFields: ["id", "emails", "name"], // Lấy email, tên
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ email: profile.emails?.[0]?.value });
        const userRole = await Role.findOne({ name: "user" });
        if (!userRole) {
          return res
            .status(400)
            .json({ success: false, message: "Role 'user' not found" });
        }

        if (!user) {
          user = new User({
            email: profile.emails?.[0]?.value || "",
            fullname: profile.name.familyName + " " + profile.name.givenName,
            roleId: userRole._id,
            isVerified: true,
          });
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

app.use("/booking", booking);
app.use("/movieshowing", movieshowing);
app.use("/room", room);
app.use("/seat", seat);
app.use("/ticket", ticket);
app.use("/auth", auth);
app.use("/cinema", cinema);
app.use("/theater", theater);
app.use("/movie", movie);
app.use("/showtime", showtime);
app.use("", order);
app.use("", oauth2);
app.set("trust proxy", true);
app.use("/voucher", voucher);
app.use("/movieshowing", movieshowing);
app.use("/movietype", movietype);
app.use("/combo", combo);
app.use("/seatAvailable", seatAvailable);
app.use("/role", role);
app.use("/feedback", feedback);
app.use("/revenue", revenue);
app.use("/user", user);
app.use("/egift", egift);
app.use("/favorite", favoriteMovie);
app.use("/support", support);
app.use("/promotion", promotion);
app.use("/banner", banner);
app.use("/service", service);
app.use(passport.initialize());
const port = process.env.PORT || 8080;

app.listen(port, () => console.log(`start server in port ${port}`));

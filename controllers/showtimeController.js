const Movie = require("../models/Movie");
const Showtime = require("../models/Showtime");
const Theater = require("../models/Theater");
const User = require("../models/User");
const Order = require("../models/Order");
const { orderByVnPay } = require("./orderController");

exports.getShowtimes = async (req, res, next) => {
  try {
    const showtimes = await Showtime.find({ isRelease: true })
      .populate([
        "movie",
        {
          path: "theater",
          populate: { path: "cinema", select: "name" },
          select: "number cinema seatPlan",
        },
      ])
      .select("-seats.user -seats.row -seats.number");

    res
      .status(200)
      .json({ success: true, count: showtimes.length, data: showtimes });
  } catch (err) {
    console.log(err);
    res.status(400).json({ success: false, message: err });
  }
};

exports.getUnreleasedShowtimes = async (req, res, next) => {
  try {
    const showtimes = await Showtime.find()
      .populate([
        "movie",
        {
          path: "theater",
          populate: { path: "cinema", select: "name" },
          select: "number cinema seatPlan",
        },
      ])
      .select("-seats.user -seats.row -seats.number");

    res
      .status(200)
      .json({ success: true, count: showtimes.length, data: showtimes });
  } catch (err) {
    console.log(err);
    res.status(400).json({ success: false, message: err });
  }
};

exports.getShowtime = async (req, res, next) => {
  try {
    const showtime = await Showtime.findById(req.params.id)
      .populate([
        "movie",
        {
          path: "theater",
          populate: { path: "cinema", select: "name" },
          select: "number cinema seatPlan",
        },
      ])
      .select("-seats.user");

    if (!showtime) {
      return res
        .status(400)
        .json({
          success: false,
          message: `Showtime not found with id of ${req.params.id}`,
        });
    }

    if (!showtime.isRelease) {
      return res
        .status(400)
        .json({ success: false, message: `Showtime is not released` });
    }

    res.status(200).json({ success: true, data: showtime });
  } catch (err) {
    console.log(err);
    res.status(400).json({ success: false, message: err });
  }
};

exports.getShowtimeWithUser = async (req, res, next) => {
  try {
    const showtime = await Showtime.findById(req.params.id).populate([
      "movie",
      {
        path: "theater",
        populate: { path: "cinema", select: "name" },
        select: "number cinema seatPlan",
      },
      {
        path: "seats",
        populate: { path: "user", select: "username email role" },
      },
    ]);

    if (!showtime) {
      return res
        .status(400)
        .json({
          success: false,
          message: `Showtime not found with id of ${req.params.id}`,
        });
    }

    res.status(200).json({ success: true, data: showtime });
  } catch (err) {
    console.log(err);
    res.status(400).json({ success: false, message: err });
  }
};

exports.addShowtime = async (req, res, next) => {
  try {
    const {
      movie: movieId,
      showtime: showtimeString,
      theater: theaterId,
      repeat = 1,
      isRelease,
    } = req.body;

    if (repeat > 31 || repeat < 1) {
      return res
        .status(400)
        .json({
          success: false,
          message: `Repeat is not a valid number between 1 to 31`,
        });
    }

    let showtime = new Date(showtimeString);
    let showtimes = [];
    let showtimeIds = [];

    const theater = await Theater.findById(theaterId);

    if (!theater) {
      return res
        .status(400)
        .json({
          success: false,
          message: `Theater not found with id of ${req.params.id}`,
        });
    }

    const movie = await Movie.findById(movieId);

    if (!movie) {
      return res
        .status(400)
        .json({
          success: false,
          message: `Movie not found with id of ${movieId}`,
        });
    }

    for (let i = 0; i < repeat; i++) {
      const showtimeDoc = await Showtime.create({
        theater,
        movie: movie._id,
        showtime,
        isRelease,
      });

      showtimeIds.push(showtimeDoc._id);
      showtimes.push(new Date(showtime));
      showtime.setDate(showtime.getDate() + 1);
    }
    theater.showtimes = theater.showtimes.concat(showtimeIds);

    await theater.save();

    res.status(200).json({
      success: true,
      showtimes: showtimes,
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({ success: false, message: err });
  }
};

exports.purchase = async (req, res, next) => {
  try {
    const { seats } = req.body;
    const user = req.user;

    const showtime = await Showtime.findById(req.params.id).populate({
      path: "theater",
      select: "seatPlan",
    });
    console.log("showtime: ");
    console.log(showtime);
    if (!showtime) {
      return res
        .status(400)
        .json({
          success: false,
          message: `Showtime not found with id of ${req.params.id}`,
        });
    }
    let numberOfSeats = 0;
    const isSeatValid = seats.every((seatNumber) => {
      numberOfSeats++;
      const [row, number] = seatNumber.match(/([A-Za-z]+)(\d+)/).slice(1);
      const maxRow = showtime.theater.seatPlan.row;
      const maxCol = showtime.theater.seatPlan.column;

      if (maxRow.length !== row.length) {
        return maxRow.length > row.length;
      }

      return maxRow.localeCompare(row) >= 0 && number <= maxCol;
    });

    if (!isSeatValid) {
      return res
        .status(400)
        .json({ success: false, message: "Seat is not valid" });
    }

    const isSeatAvailable = seats.every((seatNumber) => {
      const [row, number] = seatNumber.match(/([A-Za-z]+)(\d+)/).slice(1);
      return !showtime.seats.some(
        (seat) => seat.row === row && seat.number === parseInt(number, 10)
      );
    });

    if (!isSeatAvailable) {
      return res
        .status(400)
        .json({ success: false, message: "Seat not available" });
    }

    const seatUpdates = seats.map((seatNumber) => {
      const [row, number] = seatNumber.match(/([A-Za-z]+)(\d+)/).slice(1);
      return { row, number: parseInt(number, 10), user: user._id };
    });

    showtime.seats.push(...seatUpdates);
    const updatedShowtime = await showtime.save();
    const movie = await Movie.findById(showtime.movie._id);
    const order = await Order.create({
      user,
      showtime,
      seats: seatUpdates,
      price: movie.price * numberOfSeats,
      status: "pending",
    });

    const url = await orderByVnPay(order, req);

    res.status(200).json({ success: true, data: updatedShowtime, url });
  } catch (err) {
    console.log(err);
    res.status(400).json({ success: false, message: err });
  }
};

exports.updateShowtime = async (req, res, next) => {
  try {
    const showtime = await Showtime.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!showtime) {
      return res
        .status(400)
        .json({
          success: false,
          message: `Showtime not found with id of ${req.params.id}`,
        });
    }
    res.status(200).json({ success: true, data: showtime });
  } catch (err) {
    res.status(400).json({ success: false, message: err });
  }
};

exports.deleteShowtime = async (req, res, next) => {
  try {
    const showtime = await Showtime.findById(req.params.id);

    if (!showtime) {
      return res
        .status(400)
        .json({
          success: false,
          message: `Showtime not found with id of ${req.params.id}`,
        });
    }

    await showtime.deleteOne();

    res.status(200).json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(400).json({ success: false, message: err });
  }
};

exports.deleteShowtimes = async (req, res, next) => {
  try {
    const { ids } = req.body;

    let showtimesIds;

    if (!ids) {
      // Delete all showtimes
      showtimesIds = await Showtime.find({}, "_id");
    } else {
      // Find showtimes based on the provided IDs
      showtimesIds = await Showtime.find({ _id: { $in: ids } }, "_id");
    }

    for (const showtimeId of showtimesIds) {
      await showtimeId.deleteOne();
    }

    res.status(200).json({ success: true, count: showtimesIds.length });
  } catch (err) {
    console.log(err);
    res.status(400).json({ success: false, message: err });
  }
};

exports.deletePreviousShowtime = async (req, res, next) => {
  try {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const showtimesIds = await Showtime.find(
      { showtime: { $lt: currentDate } },
      "_id"
    );

    for (const showtimeId of showtimesIds) {
      await showtimeId.deleteOne();
    }

    res.status(200).json({ success: true, count: showtimesIds.length });
  } catch (err) {
    console.log(err);
    res.status(400).json({ success: false, message: err });
  }
};

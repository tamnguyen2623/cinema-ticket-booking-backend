const mongoose = require("mongoose");

const movieSchema = new mongoose.Schema(
  {
    cinema: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cinema",
    },
    name: {
      type: String,
      required: [true, "Please add a movie name"],
      trim: true,
    },
    length: {
      type: Number,
      required: [true, "Please add a movie length"],
    },
    img: {
      type: String,
      required: [true, "Please add a movie img"],
      trim: true,
    },
    trailer: {
      type: String,
      required: [true, "Please add a movie trailer"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Please add a movie description"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Please add a movie price"],
    },
    movieType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MovieType",
    },
    actor: {
      type: String,
    }
  },
  { timestamps: true }
);

movieSchema.pre(
  "deleteOne",
  { document: true, query: true },
  async function (next) {
    const movieId = this._id;
    const showtimes = await this.model("Showtime").find({ movie: movieId });

    for (const showtime of showtimes) {
      await showtime.deleteOne();
    }
    next();
  }
);

module.exports = mongoose.model("Movie", movieSchema);

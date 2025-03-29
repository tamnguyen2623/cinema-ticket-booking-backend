const Movie = require("../models/Movie");
const Showtime = require("../models/Showtime");
const multer = require("multer");
const { uploadMultipleFiles } = require("./fileController");
const Cinema = require("../models/Cinema");
const MovieType = require("../models/MovieType");

const upload = multer();

exports.getCustomerMovies = async (req, res) => {
  try {
    const movies = await Movie.find({ isDeleted: false }).populate("movieType", "name")
    .sort({ createdAt: -1 });;
    res.status(200).json({
      success: true,
      count: movies.length,
      data: movies,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

exports.getMovies = async (req, res, next) => {
  try {
    const movies = await Movie.find()
    .populate("movieType", "name")
    .sort({ createdAt: -1 });
    res
      .status(200)
      .json({ success: true, count: movies.length, data: movies });
  } catch (err) {
    res.status(400).json({ success: false, message: err });
  }
};
exports.countMovies = async (req, res, next) => {
  try {
    const numberOfMovies = await Movie.count();
    res.status(200).json({
      success: true,
      data: {
        totalMovies: numberOfMovies,
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err });
  }
};

exports.getShowingMovies = async (req, res, next) => {
  try {
    const showingShowtime = await Showtime.aggregate([
      { $match: { showtime: { $gte: new Date() }, isRelease: true } },
      {
        $lookup: {
          from: "movies",
          localField: "movie",
          foreignField: "_id",
          as: "movie",
        },
      },
      {
        $group: {
          _id: "$movie",
          count: { $sum: 1 },
        },
      },
      {
        $unwind: "$_id",
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$$ROOT", "$_id"],
          },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    res.status(200).json({ success: true, data: showingShowtime });
  } catch (err) {
    console.log(err);
    res.status(400).json({ success: false, message: err });
  }
};

exports.getUnreleasedShowingMovies = async (req, res, next) => {
  try {
    const showingShowtime = await Showtime.aggregate([
      { $match: { showtime: { $gte: new Date() }, isRelease: true } },
      {
        $lookup: {
          from: "movies",
          localField: "movie",
          foreignField: "_id",
          as: "movie",
        },
      },
      {
        $group: {
          _id: "$movie",
          count: { $sum: 1 },
        },
      },
      {
        $unwind: "$_id",
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$$ROOT", "$_id"],
          },
        },
      },
      {
        $sort: { count: -1, updatedAt: -1 },
      },
    ]);

    res.status(200).json({ success: true, data: showingShowtime });
  } catch (err) {
    console.log(err);
    res.status(400).json({ success: false, message: err });
  }
};

exports.getMovie = async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id).populate("movieType");

    if (!movie) {
      return res.status(400).json({
        success: false,
        message: `Movie not found with id of ${req.params.id}`,
      });
    }

    res.status(200).json({ success: true, data: movie });
  } catch (err) {
    res.status(400).json({ success: false, message: err });
  }
};

exports.createMovie = async (req, res, next) => {
  // Use multer to handle file upload from request
  upload.fields([
    { name: "img", maxCount: 1 },
    { name: "trailer", maxCount: 1 },
  ])(req, res, async function (error) {
    if (error) {
      console.error("File upload error:", error);
      return res
        .status(500)
        .json({ success: false, message: "File upload error" });
    }

    // Prepare files for S3 upload
    const filesToUpload = [];
    if (req.files["img"]) {
      filesToUpload.push(req.files["img"][0]);
    }
    if (req.files["trailer"]) {
      filesToUpload.push(req.files["trailer"][0]);
    }

    try {
      const parsedDate = new Date(req.body.releaseDate);
      // Upload files to S3 using multipart upload
      const uploadedFiles = await uploadMultipleFiles(filesToUpload);
      // Create a new movie object with the URLs from the uploaded files
      const movieData = {
        name: req.body.name,
        length: req.body.length,
        img: uploadedFiles["img"], // Use the img URL from the uploaded files
        trailer: uploadedFiles["trailer"], // Use the trailer URL from the uploaded files
        description: req.body.description,
        movieType: req.body.movieType,
        actor: req.body.actor,
        releaseDate: parsedDate, // Thêm ngày phát hành

      };
      console.log("Request Headers:", req.headers);
      console.log("Request Body:", req.body);
      console.log("Uploaded Files:", req.files);
      console.log("Files to Upload:", filesToUpload);
      console.log("Movie data", movieData);


      // Save the movie to the database
      const movie = await Movie.create(movieData);

      res.status(201).json({
        success: true,
        data: movie,
      });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  });
};

exports.updateMovie = async (req, res, next) => {
  console.log(req.body);
  console.log(req.files);
  upload.fields([
    { name: "img", maxCount: 1 },
    { name: "trailer", maxCount: 1 },
  ])(req, res, async function (error) {
    if (error) {
      console.error("File upload error:", error);
      return res
        .status(500)
        .json({ success: false, message: "File upload error" });
    }

    // Prepare files for S3 upload
    const filesToUpload = [];
    if (req.files["img"]) {
      filesToUpload.push(req.files["img"][0]);
    }
    if (req.files["trailer"]) {
      filesToUpload.push(req.files["trailer"][0]);
    }

    try {
      // Upload files to S3 using multipart upload
      const uploadedFiles = await uploadMultipleFiles(filesToUpload);
      const prevMovie = Movie.findById(req.params.id);

      // Xử lý ngày phát hành
      let releaseDate = prevMovie.releaseDate; // Mặc định giữ nguyên ngày cũ
      if (req.body.releaseDate) {
        const parsedDate = new Date(req.body.releaseDate);
        if (!isNaN(parsedDate.getTime())) {
          releaseDate = parsedDate;
        } else {
          return res.status(400).json({ success: false, message: "Invalid releaseDate format" });
        }
      }


      const movieData = {
        name: req.body.name,
        length: req.body.length,
        img: uploadedFiles["img"] ? uploadedFiles["img"] : prevMovie.img,
        trailer: uploadedFiles["trailer"]
          ? uploadedFiles["trailer"]
          : prevMovie.trailer,
        description: req.body.description,
        price: req.body.price,
        actor: req.body.actor,
        releaseDate, // Thêm ngày phát hành

      };

      const movie = await Movie.findByIdAndUpdate(req.params.id, movieData, {
        new: true,
        runValidators: true,
      });

      if (!movie) {
        return res.status(400).json({
          success: false,
          message: `Movie not found with id of ${req.params.id}`,
        });
      }
      res.status(200).json({ success: true, data: movie });
    } catch (err) {
      res.status(400).json({ success: false, message: err });
    }
  });
};

exports.deleteMovie = async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(400).json({
        success: false,
        message: `Movie not found with id of ${req.params.id}`,
      });
    }

    await movie.deleteOne();
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err });
  }
};

// Lấy danh sách phim đang chiếu
exports.getNowShowingMovies = async (req, res) => {
  try {
    const now = new Date();

    const movies = await Movie.find({
      isDeleted: false,
      releaseDate: { $lt: now } // Chỉ lấy phim có ngày phát hành lớn hơn hôm nay
    }).populate("movieType").sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: movies.length,
      data: movies,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Lấy danh sách phim sắp chiếu
exports.getUpcomingMovies = async (req, res) => {
  try {
    const now = new Date();

    // Lấy danh sách phim có lịch chiếu trong tương lai
    const movies = await Movie.find({
      isDeleted: false,
      releaseDate: { $gt: now } // Chỉ lấy phim có ngày phát hành lớn hơn hôm nay
    }).populate("movieType").sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: movies.length,
      data: movies,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.setMovieIsDeleted = async (req, res) => {
  try {
    const isDeleted = req.query.checked;
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      return res.status(404).json({ success: false, message: "Movie not found" });
    }

    movie.isDeleted = isDeleted;
    await movie.save();

    res.status(200).json({ success: true, data: movie });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
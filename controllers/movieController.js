const Movie = require("../models/Movie");
const Showtime = require("../models/Showtime");
const multer = require("multer");
const { uploadMultipleFiles } = require("./fileController");

const upload = multer();

//@desc     GET all movies
//@route    GET /movie
//@access   Public
exports.getMovies = async (req, res, next) => {
  try {
    const movies = await Movie.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: movies.length, data: movies });
  } catch (err) {
    res.status(400).json({ success: false, message: err });
  }
};

//@desc     GET showing movies
//@route    GET /movie/showing
//@access   Public
exports.getShowingMovies = async (req, res, next) => {
  try {
    const showingShowtime = await Showtime.aggregate([
      { $match: { showtime: { $gte: new Date() }, isRelease: true } },
      {
        $lookup: {
          from: "movies", // Replace "movies" with the actual collection name of your movies
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

//@desc     GET showing movies with all unreleased showtime
//@route    GET /movie/unreleased/showing
//@access   Private admin
exports.getUnreleasedShowingMovies = async (req, res, next) => {
  try {
    const showingShowtime = await Showtime.aggregate([
      { $match: { showtime: { $gte: new Date() }, isRelease: true } },
      {
        $lookup: {
          from: "movies", // Replace "movies" with the actual collection name of your movies
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

//@desc     GET single movie
//@route    GET /movie/:id
//@access   Public
exports.getMovie = async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);

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

//@desc     Create movie
//@route    POST /movie
//@access   Private
// exports.createMovie = async (req, res, next) => {
// 	try {
// 		const movie = await Movie.create(req.body)
// 		res.status(201).json({
// 			success: true,
// 			data: movie
// 		})
// 	} catch (err) {
// 		res.status(400).json({ success: false, message: err })
// 	}
// }

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
      // Upload files to S3 using multipart upload
      const uploadedFiles = await uploadMultipleFiles(filesToUpload);

      // Create a new movie object with the URLs from the uploaded files
      const movieData = {
        name: req.body.name,
        length: req.body.length,
        img: uploadedFiles["img"], // Use the img URL from the uploaded files
        trailer: uploadedFiles["trailer"], // Use the trailer URL from the uploaded files
        description: req.body.description,
        price: req.body.price,
      };

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
//@desc     Update movies
//@route    PUT /movie/:id
//@access   Private Admin
exports.updateMovie = async (req, res, next) => {
	console.log(req.body)
	console.log(req.files)
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
	  
      const movieData = {
        name: req.body.name,
        length: req.body.length,
        img: uploadedFiles["img"]?uploadedFiles["img"]:prevMovie.img,
        trailer: uploadedFiles["trailer"]?uploadedFiles["trailer"]:prevMovie.trailer,
        description: req.body.description,
        price: req.body.price,
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

//@desc     Delete single movies
//@route    DELETE /movie/:id
//@access   Private Admin
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

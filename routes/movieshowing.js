const express = require("express");
const router = express.Router();
const movieshowingController = require("../controllers/movieshowingController");

router.get("/movieshowings", movieshowingController.getAllMovieShowing);
router.get(
  "/movieshowings/:movieId",
  movieshowingController.getAllMovieShowings
);
module.exports = router;

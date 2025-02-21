const express = require("express");
const {
  addMovieShowTime,
  deleteMovieShowTime,
  filterMovieShowTimes,
  getMovieShowTimeById,
  updateMovieShowTime,
  getShowTimesBySelection,
} = require("../controllers/movieShowTimeController");
const router = express.Router();

const { protect, authorize } = require("../middleware/auth");
router
  .route("/")
  .get(filterMovieShowTimes)
  .post(addMovieShowTime);

router.route("/list").get(getShowTimesBySelection);

router
  .route("/:id")
  .get(getMovieShowTimeById)
  .put(updateMovieShowTime)
  .delete(deleteMovieShowTime);

module.exports = router;

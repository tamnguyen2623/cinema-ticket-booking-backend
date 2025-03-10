const express = require("express");
const {
  getCinemas,
  getListCinemas,
  getListCinemasForCustomer,
  getCinema,
  createCinema,
  updateCinema,
  deleteCinema,
  getUnreleasedCinemas,
} = require("../controllers/cinemaController");
const router = express.Router();

const { protect, authorize } = require("../middleware/auth");

router
  .route("/")
  .get(getListCinemasForCustomer)
  .get(getCinemas)
  .post(createCinema);
router
  .route("/unreleased")
  .get(protect, authorize("admin"), getUnreleasedCinemas);
router
  .route("/listforadmin")
  .get(getListCinemas)
router
  .route("/:id")
  .get(getCinema)
  .put(protect, authorize("admin"), updateCinema)
  .delete(protect, authorize("admin"), deleteCinema);

module.exports = router;

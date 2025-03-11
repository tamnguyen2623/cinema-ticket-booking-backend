const express = require("express");
const {
  getCinemas,
  getListCinemas,
  getListCinemasForCustomer,
  getCinema,
  createCinema,
  updateCinema,
  deleteCinema,
} = require("../controllers/cinemaController");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();


router.route("/").get(getListCinemasForCustomer);
router.route("/listforadmin").get(protect, authorize("admin"), getListCinemas);
router.route("/:id").get(getCinema);
router.route("/").post(protect, authorize("admin"), createCinema);
router.route("/:id").put(protect, authorize("admin"), updateCinema);
router.route("/:id").delete(protect, authorize("admin"), deleteCinema);

module.exports = router;

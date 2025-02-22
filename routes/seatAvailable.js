const express = require("express");
const router = express.Router();
const seatAvailableController = require("../controllers/seatAvailableController");
const { protect, authorize } = require("../middleware/auth");

router.get('/:movieShowingId', seatAvailableController.getByMovieShowingID);
router.post('/', seatAvailableController.create);
router.put('/:id', seatAvailableController.update);

module.exports = router;
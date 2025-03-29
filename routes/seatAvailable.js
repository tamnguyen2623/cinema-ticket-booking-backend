const express = require("express");
const router = express.Router();
const seatAvailableController = require("../controllers/seatAvailableController");
const { protect, authorize } = require("../middleware/auth");

router.get('/:movieShowingId', seatAvailableController.getByMovieShowingID);
router.post('/', seatAvailableController.create);
router.put('/:id', seatAvailableController.update);
router.delete('/:movieShowingId', seatAvailableController.delete);

module.exports = router;
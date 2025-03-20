const express = require("express");
const router = express.Router();
const seatController = require("../controllers/seatController");
const { protect, authorize } = require("../middleware/auth");

router.get('/', seatController.getAll);
router.get('/:roomId', seatController.getSeatsByRoomID);
router.post('/', seatController.createSeats);
router.put('/:id', seatController.update);
router.delete('/:roomId', seatController.delete);

module.exports = router;

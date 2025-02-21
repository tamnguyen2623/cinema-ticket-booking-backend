const express = require("express");
const router = express.Router();
const seatController = require("../controllers/seatController");

router.get("/seats", seatController.getAllSeats);
router.get("/seats/:roomId", seatController.getSeatsByRoom);

module.exports = router;

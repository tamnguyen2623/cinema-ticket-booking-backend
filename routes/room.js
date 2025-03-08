const express = require("express");
const router = express.Router();
const roomController = require("../controllers/roomController");
const { protect, authorize } = require("../middleware/auth");

router.post("/rooms", roomController.createRoom);
router.get("/rooms", roomController.getAllRooms);
router.get("/rooms/:id", roomController.getRoomById);
router.put(
  "/rooms/:id",
  protect,
  authorize("admin"),
  roomController.updateRoom
);
router.delete(
  "/rooms/:id",
  protect,
  authorize("admin"),
  roomController.deleteRoom
);
router.patch(
  "/rooms/:id/status",
  protect,
  authorize("admin"),
  roomController.updateRoomStatus
);
module.exports = router;

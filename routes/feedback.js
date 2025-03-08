const express = require("express");
const router = express.Router();
const featController = require("../controllers/feedbackController");
const { protect, authorize } = require("../middleware/auth");

router.get("/", featController.getAll);
router.get(
  "/getAvailableFeedback/:movieId",
  featController.getAvailableFeedbacks
);
router.get("/getFeedback/:bookingId", featController.getFeedback);
router.get("/filter/:movieId", featController.filterFeedback);
router.post("/", featController.create);
router.put("/:id", featController.update);

module.exports = router;

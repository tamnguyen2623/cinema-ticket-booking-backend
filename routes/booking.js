const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const { protect } = require("../middleware/auth");

router.post("/booking/vnpay/order", protect, bookingController.orderByVnPay);
router.get("/booking/vnpay/callback", bookingController.callBackVnPay);
router.get(
  "/booking/:transactionId",
  bookingController.getBookingByTransactionId
);
module.exports = router;

// const express = require("express");
// const {
//   createBooking,
//   getUserBookings,
//   processPayment,
//   verifyPayment,
// } = require("../controllers/bookingController");

// const router = express.Router();
// const { protect, authorize } = require("../middleware/auth");

// // Routes booking
// router.post("/create-booking", protect, createBooking);
// router.get("/bookings/:userId", protect, getUserBookings);

// // Routes thanh toán
// router.post("/payment", protect, processPayment);
// router.get("/payment-return", verifyPayment);

// module.exports = router;

// 📦 booking.js
const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const { protect } = require("../middleware/auth");

// Route thanh toán VNPAY
router.post("/booking/vnpay/order", protect, bookingController.orderByVnPay);

// Route callback sau khi thanh toán
router.get("/booking/vnpay/callback", bookingController.callBackVnPay);
router.get(
  "/booking/:transactionId",
  bookingController.getBookingByTransactionId
);
module.exports = router;

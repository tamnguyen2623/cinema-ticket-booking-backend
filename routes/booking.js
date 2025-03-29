const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const { protect, authorize } = require("../middleware/auth");

router.post("/booking/vnpay/order", protect, bookingController.orderByVnPay);
router.get("/booking/vnpay/callback", bookingController.callBackVnPay);
router.post("/booking/momo/order", protect, bookingController.bookingByMomo);
router.post("/booking/egift-card/order", protect, bookingController.bookingByEgiftCard);
router.get("/booking/momo/callback", bookingController.callbackMomo);
router.get(
  "/booking/:transactionId",
  bookingController.getBookingByTransactionId
);
router.get("/booking/user/:userId", bookingController.getUserBookings);
router.get("/user/total/:userId", bookingController.getTotal);

router.get(
  "/booking/ticket/:bookingId",
  bookingController.getTicketByBookingId
);

router.get(
  "/admin/all",
  protect,
  authorize("admin"),
  bookingController.getAllBooks
);
router.put("/booking/:id", bookingController.update);

module.exports = router;

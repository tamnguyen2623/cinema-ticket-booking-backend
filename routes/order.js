const express = require("express");
const {
  callBackVnPay,
  getOrders,
  exportOrdersToExcelFile,
  countOrders,
  totalRevenue,
  countOrdersByCinema,
  getTotalRevenueByCinema,
  getTotalRevenueByMonth,
  getTotalRevenueByMovie,
} = require("../controllers/orderController");

const router = express.Router();

const { protect, authorize } = require("../middleware/auth");

router.get("/admin/orders", protect, authorize("admin"), getOrders);
router.get(
  "/order/export",
  protect,
  authorize("admin"),
  exportOrdersToExcelFile
);
router.get("/order/total", protect, authorize("admin"), countOrders);
router.get("/order/revenue", protect, authorize("admin"), totalRevenue);
router.get("/order/analysis", protect, authorize("admin"), countOrdersByCinema);
router.get(
  "/order/revenue-by-cinema",
  protect,
  authorize("admin"),
  getTotalRevenueByCinema
);
router.get(
  "/order/revenue-by-movie",
  protect,
  authorize("admin"),
  getTotalRevenueByMovie
);
router.get(
  "/order/revenue-by-month",
  protect,
  authorize("admin"),
  getTotalRevenueByMonth
);

module.exports = router;

const express = require('express');
const { callBackVnPay,
    getOrders,
    exportOrdersToExcelFile,
    countOrders,
    totalRevenueV2,
    countOrdersByCinema,
    getTotalRevenueByCinema,
    getTotalRevenueByMonth,
    exportTotalRevenueByCinema,
    exportTotalRevenueByMovie,
    exportTotalRevenueByMonth,
    exportRevenueByDay,
    exportTotalTicketsRevenueByTicket,
    exportTotalTicketsRevenue
} = require('../controllers/orderController');

const router = express.Router();

const { protect, authorize } = require("../middleware/auth");
const { getTotalRevenueByMovie } = require('../controllers/revenueController');

// router.get('/call-back/vnpay', callBackVnPay);
router.get('/admin/orders', protect, authorize('admin'), getOrders);
router.get('/order/export', protect, authorize('admin'), exportOrdersToExcelFile);
router.get('/order/total', protect, authorize('admin'), countOrders);
router.get('/order/revenue', protect, authorize('admin'), totalRevenueV2);
router.get('/order/analysis', protect, authorize('admin'), countOrdersByCinema);
router.get('/order/revenue-by-cinema', protect, authorize('admin'), getTotalRevenueByCinema);
router.get('/order/revenue-by-movie', protect, authorize('admin'), getTotalRevenueByMovie);
router.get('/order/revenue-by-month', protect, authorize('admin'), getTotalRevenueByMonth);
router.get('/order/exportTotalRevenueByCinema', exportTotalRevenueByCinema);
router.get('/order/exportTotalRevenueByMovie', exportTotalRevenueByMovie);
router.get('/order/exportRevenueByDay', exportRevenueByDay);
router.get('/order/exportTotalRevenueByMonth', exportTotalRevenueByMonth);
router.get('/order/exportTotalTicketsRevenueByTicket', exportTotalTicketsRevenueByTicket);
router.get('/order/exportTotalTicketsRevenue', exportTotalTicketsRevenue);

module.exports = router;

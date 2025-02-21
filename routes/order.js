const express = require('express');
const { callBackVnPay, getOrders, exportOrdersToExcelFile, countOrders, totalRevenue, countOrdersByCinema } = require('../controllers/orderController');

const router = express.Router()

const { protect, authorize } = require('../middleware/auth');

// router.get('/call-back/vnpay', callBackVnPay);
router.get('/admin/orders', protect, authorize('admin'), getOrders);
router.get('/order/export', protect, authorize('admin'), exportOrdersToExcelFile);
router.get('/order/total', protect, authorize('admin'), countOrders);
router.get('/order/revenue', protect, authorize('admin'), totalRevenue);
router.get('/order/analysis', protect, authorize('admin'), countOrdersByCinema);

module.exports = router

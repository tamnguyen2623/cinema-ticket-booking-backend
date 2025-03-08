const express = require('express');
const router = express.Router();

const { protect, authorize } = require("../middleware/auth");
const { getRevenueByDay, getRevenueByNewCustomers } = require('../controllers/revenueController');

router.get('/revenue-by-day', protect, authorize('admin'), getRevenueByDay);
router.get('/revenue-by-new-customers', protect, authorize('admin'), getRevenueByNewCustomers);

module.exports = router;
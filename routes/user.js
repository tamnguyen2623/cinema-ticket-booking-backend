const express = require('express');
const router = express.Router();

const { protect, authorize } = require("../middleware/auth");
const { exportCustomers } = require('../controllers/userController');

router.get('/export-customers', protect, authorize('admin'), exportCustomers);

module.exports = router;
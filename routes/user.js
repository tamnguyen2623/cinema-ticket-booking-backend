const express = require('express');
const router = express.Router();

const { protect, authorize } = require("../middleware/auth");
const { exportCustomers,exportNewCustomers } = require('../controllers/userController');

router.get('/export-customers', protect, authorize('admin'), exportCustomers);
router.get('/exportNewCustomers', protect, authorize('admin'), exportNewCustomers);


module.exports = router;
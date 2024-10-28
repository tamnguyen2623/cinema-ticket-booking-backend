const express = require('express')
const { getURL, callBackVnPay } = require('../controllers/orderController')

const router = express.Router()

const { protect, authorize } = require('../middleware/auth')

router.get('/call-back/vnpay', callBackVnPay)

module.exports = router

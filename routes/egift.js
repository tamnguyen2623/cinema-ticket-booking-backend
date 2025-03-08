const express = require('express');
const { createEGift, updateEGift, softDeleteEGift, getAllEGifts, getActiveEGifts } = require('../controllers/EGiftController');

const router = express.Router();

router.post('/egifts', createEGift);
router.put('/egifts/:id', updateEGift);
router.put('/egifts/:id', softDeleteEGift);
router.get('/egifts', getAllEGifts);
router.get('/egifts/active', getActiveEGifts);

module.exports = router;

const express = require('express');
const { protect, authorize } = require("../middleware/auth");
const { createEGift, updateEGift, softDeleteEGift, getAllEGifts, getActiveEGifts, updateIsDelete, getEGiftById, sendEGiftToUser } = require('../controllers/EGiftController');

const router = express.Router();

router.post('/egifts', createEGift);
router.put('/egifts/:id', updateEGift);
router.put('/egifts/:id', softDeleteEGift);
router.get('/egifts', getAllEGifts);
router.put('/updateIsDelete/:id', updateIsDelete);
router.get('/egifts/active', getActiveEGifts);
router.get('/egifts/:id', getEGiftById);
router.post('/egift-cards/send/:id', protect, sendEGiftToUser);

module.exports = router;

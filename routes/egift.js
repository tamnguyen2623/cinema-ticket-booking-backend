const express = require('express');
const { createEGift, updateEGift, softDeleteEGift, getAllEGifts, getActiveEGifts, updateIsDelete, getEGiftById } = require('../controllers/EGiftController');

const router = express.Router();

router.post('/egifts', createEGift);
router.put('/egifts/:id', updateEGift);
router.put('/egifts/:id', softDeleteEGift);
router.get('/egifts', getAllEGifts);
router.put('/updateIsDelete/:id', updateIsDelete);
router.get('/egifts/active', getActiveEGifts);
router.get('/egifts/:id', getEGiftById);

module.exports = router;

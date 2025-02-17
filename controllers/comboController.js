const Combo = require('../models/Combo');
const mongoose = require('mongoose');
const multer = require("multer");

// Get all combos
exports.getCombos = async (req, res, next) => {
    try {
        const combos = await Combo.find({ isDelete: false });
        res.status(200).json({ success: true, data: combos });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Get single combo by ID
exports.getCombo = async (req, res, next) => {
    try {
        const combo = await Combo.findById(req.params.id);
        if (!combo || combo.isDelete) {
            return res.status(404).json({ success: false, message: `Combo not found with id ${req.params.id}` });
        }
        res.status(200).json({ success: true, data: combo });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Search combo by name
exports.searchComboByName = async (req, res, next) => {
    try {
        const combo = await Combo.findOne({ name: req.query.name, isDelete: false });
        if (!combo) {
            return res.status(404).json({ success: false, message: `Combo not found with name ${req.query.name}` });
        }
        res.status(200).json({ success: true, data: combo });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Cấu hình lưu trữ file
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

exports.createCombo = async (req, res) => {
    try {
        const { name, description } = req.body;

        // Kiểm tra nếu có ảnh được upload
        const image = req.file ? req.file.buffer.toString("base64") : null;

        const combo = await Combo.create({
            name,
            description,
            image,
            isDelete: false
        });

        res.status(201).json({ success: true, data: combo });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
// Update combo
exports.updateCombo = async (req, res, next) => {
    try {
        const combo = await Combo.findById(req.params.id);
        if (!combo || combo.isDelete) {
            return res.status(404).json({ success: false, message: `Combo not found with id ${req.params.id}` });
        }

        Object.assign(combo, req.body);
        await combo.save();
        res.status(200).json({ success: true, data: combo });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Soft delete combo
exports.deleteCombo = async (req, res, next) => {
    try {
        const combo = await Combo.findById(req.params.id);
        if (!combo || combo.isDelete) {
            return res.status(404).json({ success: false, message: `Combo not found with id ${req.params.id}` });
        }

        combo.isDelete = true;
        await combo.save();
        res.status(200).json({ success: true, message: 'Combo marked as deleted' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

const Combo = require('../models/Combo');
const mongoose = require('mongoose');
const multer = require("multer");
const { uploadMultipleFiles } = require("./fileController");

const upload = multer();
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


// exports.createCombo = async (req, res) => {
//     try {
//         const { name, description, image } = req.body;
//         const combo = await Combo.create({
//             name,
//             description,
//             image,
//             isDelete: false
//         });

//         res.status(201).json({ success: true, data: combo });
//     } catch (err) {
//         res.status(400).json({ success: false, message: err.message });
//     }
// };
exports.createCombo = async (req, res, next) => {
    // Sử dụng multer để xử lý tệp từ yêu cầu
    upload.fields([
        { name: "image", maxCount: 1 },
    ])(req, res, async function (error) {
        if (error) {
            console.error("File upload error:", error);
            return res.status(500).json({ success: false, message: "File upload error" });
        }

        // Kiểm tra xem file có tồn tại trong req.files không
        if (!req.files["image"] || req.files["image"].length === 0) {
            return res.status(400).json({ success: false, message: "No image file provided" });
        }

        // Sử dụng uploadMultipleFiles để tải lên S3 hoặc lưu trữ theo cách khác
        const filesToUpload = [req.files["image"][0]]; // Chỉ lấy file ảnh đầu tiên
        try {
            // Giả sử bạn đã cấu hình uploadMultipleFiles để tải ảnh lên
            const uploadedFiles = await uploadMultipleFiles(filesToUpload);
            const comboData = {
                name: req.body.name,
                img: uploadedFiles["image"], // Sử dụng URL của ảnh từ S3
                description: req.body.description,
                price: req.body.price,
                isDelete: false
            };

            // Lưu combo vào cơ sở dữ liệu
            const combo = await Combo.create(comboData);
            res.status(201).json({ success: true, data: combo });
        } catch (err) {
            console.error("Error uploading files:", err);
            res.status(400).json({ success: false, message: err.message });
        }
    });
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

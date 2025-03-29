const Combo = require("../models/Combo");
const mongoose = require("mongoose");
const multer = require("multer");
const { uploadMultipleFiles } = require("./fileController");

const upload = multer();
// Get all combos
exports.getCombos = async (req, res, next) => {
  try {
    const combos = await Combo.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: combos });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Get all combos
exports.getCombosIsNotDisabled = async (req, res, next) => {
  try {
    const combos = await Combo.find({ isDelete: false }).sort({ createdAt: -1 });
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
      return res.status(404).json({
        success: false,
        message: `Combo not found with id ${req.params.id}`,
      });
    }
    res.status(200).json({ success: true, data: combo });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Search combo by name
exports.searchComboByName = async (req, res, next) => {
  try {
    const combo = await Combo.findOne({
      name: { $regex: req.params.name, $options: "i" },
    }).sort({ createdAt: -1 });
    if (!combo) {
      return res.status(404).json({
        success: false,
        message: `Combo not found with name ${req.params.name}`,
      });
    }
    res.status(200).json({ success: true, data: combo });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.createCombo = async (req, res, next) => {
  upload.fields([{ name: "image", maxCount: 1 }])(
    req,
    res,
    async function (error) {
      if (error) {
        console.error("File upload error:", error);
        return res
          .status(500)
          .json({ success: false, message: "File upload error" });
      }

      console.log("Request files:", req.files); // Kiểm tra multer có nhận file không
      if (!req.files["image"] || req.files["image"].length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "No image file provided" });
      }

      try {
        const uploadedFiles = await uploadMultipleFiles([
          req.files["image"][0],
        ]);
        const comboData = {
          name: req.body.name,
          image: uploadedFiles["image"], // Đảm bảo dùng đúng key
          description: req.body.description,
          price: req.body.price,
          isDelete: false,
        };

        const combo = await Combo.create(comboData);
        res.status(201).json({ success: true, data: combo });
      } catch (err) {
        console.error("Error uploading files:", err);
        res.status(400).json({ success: false, message: err.message });
      }
    }
  );
};

// Update combo
exports.updateCombo = async (req, res, next) => {
  upload.fields([{ name: "image", maxCount: 1 }])(
    req,
    res,
    async function (error) {
      if (error) {
        return res
          .status(500)
          .json({ success: false, message: "File upload error" });
      }

      try {
        const combo = await Combo.findById(req.params.id);
        if (!combo) {
          return res.status(404).json({
            success: false,
            message: `Combo not found with id ${req.params.id}`,
          });
        }

        if (req.files["image"] && req.files["image"].length > 0) {
          const uploadedFiles = await uploadMultipleFiles([
            req.files["image"][0],
          ]);
          combo.image = uploadedFiles["image"];
        }

        combo.name = req.body.name || combo.name;
        combo.description = req.body.description || combo.description;
        combo.price = req.body.price || combo.price;

        await combo.save();
        res.status(200).json({ success: true, data: combo });
      } catch (err) {
        res.status(400).json({ success: false, message: err.message });
      }
    }
  );
};

exports.updateIsDelete = async (req, res, next) => {
  Combo.updateOne({ _id: req.params.id }, req.body)
    .then(() => res.status(200).json({ _id: req.params.id, data: req.body }))
    .catch((error) => res.status(500).json({ message: error.message }));
};

// Soft delete combo
exports.deleteCombo = async (req, res, next) => {
  try {
    const combo = await Combo.findById(req.params.id);
    if (!combo || combo.isDelete) {
      return res.status(404).json({
        success: false,
        message: `Combo not found with id ${req.params.id}`,
      });
    }

    combo.isDelete = true;
    await combo.save();
    res.status(200).json({ success: true, message: "Combo marked as deleted" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

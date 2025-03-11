const EGift = require("../models/EGiftCard");
const multer = require("multer");
const { uploadMultipleFiles } = require("./fileController");

const upload = multer();

// Lấy danh sách tất cả eGift
exports.getAllEGifts = async (req, res) => {
  try {
    const egifts = await EGift.find();
    res.status(200).json({ success: true, data: egifts });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Lấy danh sách eGift chưa bị xóa (isDelete: false)
exports.getActiveEGifts = async (req, res) => {
  try {
    const egifts = await EGift.find({ isDelete: false });
    res.status(200).json({ success: true, data: egifts });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Lấy một eGift theo ID
exports.getEGiftById = async (req, res) => {
  try {
    const egift = await EGift.findById(req.params.id);
    if (!egift || egift.isDelete) {
      return res.status(404).json({ success: false, message: "EGift not found" });
    }
    res.status(200).json({ success: true, data: egift });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Tạo một eGift mới
exports.createEGift = async (req, res) => {
  upload.fields([{ name: "image", maxCount: 1 }])(req, res, async function (error) {
    if (error) {
      return res.status(500).json({ success: false, message: "File upload error" });
    }

    if (!req.files["image"] || req.files["image"].length === 0) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }

    try {
      const uploadedFiles = await uploadMultipleFiles([req.files["image"][0]]);
      const egiftData = {
        name: req.body.name,
        image: uploadedFiles["image"],
        description: req.body.description,
        isDelete: false,
      };
      const egift = await EGift.create(egiftData);
      res.status(201).json({ success: true, data: egift });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  });
};

// Cập nhật eGift
exports.updateEGift = async (req, res) => {
  upload.fields([{ name: "image", maxCount: 1 }])(req, res, async function (error) {
    if (error) {
      return res.status(500).json({ success: false, message: "File upload error" });
    }

    try {
      const egift = await EGift.findById(req.params.id);
      if (!egift || egift.isDelete) {
        return res.status(404).json({ success: false, message: "EGift not found" });
      }

      if (req.files["image"] && req.files["image"].length > 0) {
        const uploadedFiles = await uploadMultipleFiles([req.files["image"][0]]);
        egift.image = uploadedFiles["image"];
      }

      egift.name = req.body.name || egift.name;
      egift.description = req.body.description || egift.description;

      await egift.save();
      res.status(200).json({ success: true, data: egift });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  });
};

exports.updateIsDelete = async (req, res, next) => {
  EGift.updateOne({ _id: req.params.id }, req.body)
    .then(() => res.status(200).json({ _id: req.params.id, data: req.body }))
    .catch((error) => res.status(500).json({ message: error.message }));
};
// Xóa mềm eGift (đánh dấu isDelete là true)
exports.softDeleteEGift = async (req, res) => {
  try {
    const egift = await EGift.findById(req.params.id);
    if (!egift || egift.isDelete) {
      return res.status(404).json({ success: false, message: "EGift not found" });
    }

    egift.isDelete = true;
    await egift.save();
    res.status(200).json({ success: true, message: "EGift marked as deleted" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

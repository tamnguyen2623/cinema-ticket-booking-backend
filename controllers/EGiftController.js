const EGift = require("../models/EGiftCard");

// @desc    Tạo một eGift mới
// @route   POST /api/egifts
exports.createEGift = async (req, res) => {
  try {
    const egift = await EGift.create(req.body);
    res.status(201).json({ success: true, data: egift });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Cập nhật thông tin eGift
// @route   PUT /api/egifts/:id
exports.updateEGift = async (req, res) => {
  try {
    const egift = await EGift.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!egift) {
      return res
        .status(404)
        .json({ success: false, message: "EGift not found" });
    }

    res.status(200).json({ success: true, data: egift });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Xóa mềm eGift (chuyển isDelete thành true)
// @route   DELETE /api/egifts/:id
exports.softDeleteEGift = async (req, res) => {
  try {
    const { id } = req.params;
    const egift = await EGift.findById(id);

    if (!egift) {
      return res
        .status(404)
        .json({ success: false, message: "EGift not found" });
    }
    egift.isDelete = !egift.isDelete;
    await egift.save();
    res
      .status(200)
      .json({
        success: true,
        message: "EGift deleted successfully",
        data: egift,
      });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Lấy danh sách tất cả eGift (bao gồm cả isDelete: true và false)
// @route   GET /api/egifts
exports.getAllEGifts = async (req, res) => {
  try {
    const egifts = await EGift.find();
    res.status(200).json({ success: true, data: egifts });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Lấy danh sách eGift chưa bị xóa (isDelete: false) dành cho khách hàng
// @route   GET /api/egifts/active
exports.getActiveEGifts = async (req, res) => {
  try {
    const egifts = await EGift.find({ isDelete: false });
    res.status(200).json({ success: true, data: egifts });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

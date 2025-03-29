const Support = require("../models/Support");

exports.getQuestionsForCustomer = async (req, res) => {
  try {
    const supports = await Support.find({ isDelete: false }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: supports });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching support list", error });
  }
};

//Lấy tất cả câu hỏi chưa bị xóa
exports.getAllSupports = async (req, res) => {
  try {
    const supports = await Support.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: supports });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching support list", error });
  }
};

// Lấy chi tiết câu hỏi theo ID
exports.getSupportById = async (req, res) => {
  try {
    const support = await Support.findById(req.params.id);
    if (!support) {
      return res
        .status(404)
        .json({ success: false, message: "Support question not found!" });
    }
    res.status(200).json({ success: true, data: support });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching support question!",
      error,
    });
  }
};

//Tạo câu hỏi mới
exports.createSupport = async (req, res) => {
  try {
    const { question, answer, type } = req.body;
    if (!question || !answer || !type) {
      return res.status(400).json({
        success: false,
        message: "Question, answer, and support type are required!",
      });
    }

    const newSupport = new Support({ question, answer, type });
    await newSupport.save();

    res.status(201).json({
      success: true,
      message: "Support question has been added successfully!",
      data: newSupport,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error adding support question!",
      error,
    });
  }
};

//Cập nhật câu trả lời
exports.updateSupport = async (req, res) => {
  try {
    const { question, answer, type } = req.body;
    const supportId = req.params.id;

    const updatedSupport = await Support.findByIdAndUpdate(
      supportId,
      { question, answer, type },
      { new: true }
    );

    if (!updatedSupport) {
      return res
        .status(404)
        .json({ success: false, message: "Support question not found!" });
    }

    res.status(200).json({
      success: true,
      message: "Support answer updated successfully!",
      data: updatedSupport,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating support answer!",
      error,
    });
  }
};

//Xóa mềm câu hỏi
exports.deleteSupport = async (req, res) => {
  try {
    const supportId = req.params.id;
    const deletedSupport = await Support.findByIdAndUpdate(
      supportId,
      { isDelete: true },
      { new: true }
    );

    if (!deletedSupport) {
      return res
        .status(404)
        .json({ success: false, message: "Support question not found!" });
    }

    res.status(200).json({
      success: true,
      message: "Support question has been deleted successfully!",
      data: deletedSupport,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting support question!",
      error,
    });
  }
};

//Toggle trạng thái xóa mềm
exports.toggleIsDelete = async (req, res) => {
  try {
    const supportId = req.params.id;
    const support = await Support.findById(supportId);

    if (!support) {
      return res
        .status(404)
        .json({ success: false, message: "Support question not found!" });
    }

    support.isDelete = !support.isDelete;
    await support.save();

    res.status(200).json({
      success: true,
      message: `Support question ${
        support.isDelete ? "deleted" : "restored"
      } successfully!`,
      data: support,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error toggling delete status!",
      error,
    });
  }
};

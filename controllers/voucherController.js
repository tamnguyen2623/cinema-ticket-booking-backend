const Voucher = require("../models/Voucher.js");

const getAllVouchers = async (req, res) => {
  try {
    const vouchers = await Voucher.find().sort({ createdAt: -1 });
    res.status(200).json({ vouchers });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
};


const getAllVouchersForCustomer = async (req, res) => {
  try {
    const vouchers = await Voucher.find({isDelete: false});
    res.status(200).json({ vouchers });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
};

const addVoucher = async (req, res) => {
  try {
    const { code, discount, discountType, expiredDate, description } = req.body;
    const existingVoucher = await Voucher.findOne({ code });
    if (existingVoucher) {
      return res.status(400).json({ message: "Voucher code already exists" });
    }

    const newVoucher = new Voucher({
      code,
      discount,
      discountType,
      expiredDate,
      isUsed: false,
      isDelete: false,
    });

    await newVoucher.save();
    res
      .status(201)
      .json({ message: "Voucher added successfully", voucher: newVoucher });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
};

const filterVouchers = async (req, res) => {
  try {
    const { isUsed, expiredDate } = req.query;
    let filters = {};

    if (isUsed !== undefined) filters.isUsed = isUsed === "true";
    if (expiredDate) filters.expiredDate = { $lte: new Date(expiredDate) };

    const vouchers = await Voucher.find(filters).sort({ createdAt: -1 });
    res.status(200).json({ vouchers });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
};

const updateVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, discount, discountType, expiredDate, description, isUsed } =
      req.body;

    const updatedVoucher = await Voucher.findByIdAndUpdate(
      id,
      { code, discount, discountType, expiredDate, isUsed },
      { new: true }
    );

    if (!updatedVoucher) {
      return res.status(404).json({ message: "Voucher not found" });
    }

    res.status(200).json({
      message: "Voucher updated successfully",
      voucher: updatedVoucher,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
};

const deleteVoucher = async (req, res) => {
  try {
    const { id } = req.params;

    const voucher = await Voucher.findById(id);
    if (!voucher) {
      return res.status(404).json({ message: "Voucher not found" });
    }
    voucher.isDelete = !voucher.isDelete;
    await voucher.save();

    res.status(200).json({
      message: "Voucher status updated successfully",
      voucher,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
};

module.exports = {
  addVoucher,
  filterVouchers,
  updateVoucher,
  deleteVoucher,
  getAllVouchers,
  getAllVouchersForCustomer,
};

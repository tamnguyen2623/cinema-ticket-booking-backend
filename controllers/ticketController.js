
const mongoose = require("mongoose");
const TicketPrice = require("../models/Ticket");

exports.createTicketPrice = async (req, res) => {
  try {
    console.log("📡 Dữ liệu nhận được từ frontend:", req.body);

    const { roomId, seatType, price } = req.body;

    if (!roomId || !seatType || !price) {
      return res.status(400).json({ message: "Thiếu dữ liệu bắt buộc!" });
    }

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: "Room ID không hợp lệ!" });
    }

    if (isNaN(price) || Number(price) <= 0) {
      return res.status(400).json({ message: "Giá phải là số và lớn hơn 0!" });
    }

    // ✅ Chuyển price thành số trước khi lưu
    const newTicket = new TicketPrice({
      roomId,
      seatType,
      price: Number(price),
    });
    await newTicket.save();

    console.log("✅ Vé mới đã được tạo:", newTicket);
    res.status(201).json(newTicket);
  } catch (error) {
    console.error("❌ Lỗi Backend:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

exports.getAllTicketPrices = async (req, res) => {
  try {
    const ticketPrices = await TicketPrice.find({ isDelete: false });
    res.status(200).json({ ticketPrices });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getTicketPriceById = async (req, res) => {
  try {
    const ticketPrice = await TicketPrice.findById(req.params.id);

    if (!ticketPrice || ticketPrice.isDelete) {
      return res.status(404).json({ message: "Ticket price not found" });
    }

    res.status(200).json({ ticketPrice });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateTicketPrice = async (req, res) => {
  try {
    const { roomType, seatType, price } = req.body;

    const updatedTicketPrice = await TicketPrice.findByIdAndUpdate(
      req.params.id,
      { roomType, seatType, price, updatedAt: Date.now() },
      { new: true }
    );

    if (!updatedTicketPrice || updatedTicketPrice.isDelete) {
      return res.status(404).json({ message: "Ticket price not found" });
    }

    res.status(200).json({
      message: "Ticket price updated successfully",
      ticketPrice: updatedTicketPrice,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteTicketPrice = async (req, res) => {
  try {
    const ticketPrice = await TicketPrice.findById(req.params.id);

    if (!ticketPrice || ticketPrice.isDelete) {
      return res.status(404).json({ message: "Ticket price not found" });
    }

    ticketPrice.isDelete = true;
    await ticketPrice.save();

    res.status(200).json({ message: "Ticket price deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

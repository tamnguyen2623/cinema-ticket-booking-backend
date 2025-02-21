const Seat = require("../models/Seat");

// Lấy tất cả ghế
exports.getAllSeats = async (req, res) => {
  try {
    const seats = await Seat.find().populate("room", "name"); // Lấy thêm thông tin phòng
    res.status(200).json({ success: true, seats });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách ghế!",
      error: error.message,
    });
  }
};

// Lấy ghế theo roomId
exports.getSeatsByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const seats = await Seat.find({ room: roomId });

    if (!seats.length) {
      return res
        .status(404)
        .json({ success: false, message: "Không có ghế trong phòng này!" });
    }

    res.status(200).json({ success: true, seats });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách ghế theo phòng!",
      error: error.message,
    });
  }
};

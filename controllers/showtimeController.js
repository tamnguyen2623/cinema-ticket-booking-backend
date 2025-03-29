const Showtime = require('../models/Showtime'); // Assuming the model is in the models folder
const moment = require("moment-timezone");
// Get all showtimes
exports.getAllShowtimes = async (req, res, next) => {
  try {
    const showtimes = await Showtime.find().sort({ createdAt: -1 }); // Get showtimes that are not deleted
    res.status(200).json(showtimes);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get a single showtime by ID
exports.getShowtimeById = async (req, res, next) => {
  try {
    const showtime = await Showtime.findById(req.params.id);
    if (!showtime) {
      return res.status(404).json({ message: 'Showtime not found' });
    }
    res.status(200).json(showtime);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new showtime
exports.createShowtime = async (req, res, next) => {
  try {
    const { startTime } = req.body;
    if (!startTime) {
      return res.status(400).json({ message: 'Please provide showtime' });
    }

    // Chuyển startTime từ múi giờ địa phương sang UTC
    const utcStartTime = moment(startTime).tz("UTC").toISOString();
    console.log('startTime đã chuyển về UTC:', utcStartTime);

    const newShowtime = new Showtime({ startTime: utcStartTime });
    await newShowtime.save();
    res.status(201).json(newShowtime);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: 'Server error' });
  }
};


// Update a showtime by ID
// Update a showtime by ID
exports.updateShowtimeById = async (req, res, next) => {
  try {
    const { startTime } = req.body;

    if (!startTime) {
      return res.status(400).json({ message: 'Please provide showtime' });
    }

    // Chuyển startTime từ múi giờ địa phương sang UTC
    const utcStartTime = moment(startTime).tz("UTC").toISOString();
    console.log('startTime đã chuyển về UTC:', utcStartTime);

    // Cập nhật giờ chiếu với startTime mới
    const updatedShowtime = await Showtime.findByIdAndUpdate(
      req.params.id,
      { startTime: utcStartTime },  // Chỉ cần cập nhật startTime
      { new: true }
    );

    if (!updatedShowtime) {
      return res.status(404).json({ message: 'Showtime not found' });
    }

    res.status(200).json(updatedShowtime);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateIsDelete = async (req, res, next) => {
  Showtime.updateOne({ _id: req.params.id }, req.body)
    .then(() => res.status(200).json({ _id: req.params.id, data: req.body }))
    .catch((error) => res.status(500).json({ message: error.message }));
};

// Soft delete a showtime (mark it as deleted)
exports.deleteShowtimeById = async (req, res, next) => {  // Đổi tên hàm thành `deleteShowtimeById`
  try {
    const showtime = await Showtime.findByIdAndUpdate(
      req.params.id,
      { isDelete: true },
      { new: true }
    );

    if (!showtime) {
      return res.status(404).json({ message: 'Showtime not found' });
    }

    res.status(200).json({ message: 'Showtime deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};


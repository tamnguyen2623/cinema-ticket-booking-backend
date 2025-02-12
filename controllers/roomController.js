const Room = require("../models/Room");
const Cinema = require("../models/Cinema");
const Seat = require("../models/Seat");
exports.createRoom = async (req, res) => {
  try {
    const { cinema, roomname, roomtype, seatnumber } = req.body;

    if (!cinema || !roomname || !roomtype || !seatnumber) {
      return res.status(400).json({ message: "All fields are required!" });
    }

    const cinemaExists = await Cinema.findById(cinema);
    if (!cinemaExists) {
      return res.status(400).json({ message: "Cinema not found!" });
    }

    const newRoom = new Room({
      cinema,
      roomname,
      roomtype,
      seatnumber,
      seats: [],
    });

    await newRoom.save();
    res
      .status(201)
      .json({ message: "Room created successfully", room: newRoom });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAllRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ status: true })
      .populate("cinema")
      .populate("seats");
    res.status(200).json({ rooms });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate("cinema")
      .populate("seats");
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }
    res.status(200).json({ room });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const { roomname, roomtype, seatnumber } = req.body;

    const updatedRoom = await Room.findByIdAndUpdate(
      req.params.id,
      { roomname, roomtype, seatnumber },
      { new: true }
    );

    if (!updatedRoom) {
      return res.status(404).json({ message: "Room not found" });
    }

    res
      .status(200)
      .json({ message: "Room updated successfully", room: updatedRoom });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    room.status = false;
    await room.save();

    res.status(200).json({
      message: "Room deactivated successfully, and its seats deleted",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const TicketPrice = require("../models/Ticket");

exports.createTicketPrice = async (req, res) => {
  try {
    const { roomType, seatType, price } = req.body;

    if (!roomType || !seatType || !price) {
      return res.status(400).json({ message: "All fields are required!" });
    }

    const newTicketPrice = new TicketPrice({
      roomType,
      seatType,
      price,
    });

    await newTicketPrice.save();
    res.status(201).json({
      message: "Ticket price created successfully",
      ticketPrice: newTicketPrice,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
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

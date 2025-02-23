const SeatAvailable = require("../models/SeatAvailable");
const Seat = require("../models/Seat");

class SeatAvailableController {
  // List of Seat Availables
  async getByMovieShowingID(req, res, next) {
    const { movieShowingId } = req.params;
    try {
      const seats = await SeatAvailable.find({
        movieShowingId: movieShowingId,
      }).populate("seatId");
      res.status(200).json(seats);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Create multiple seats
  async create(req, res, next) {
    const { roomId, movieShowingId } = req.body;

    try {
      const seats = await Seat.find({ roomId: roomId });
      const seatAvailables = [];

      for (let i = 0; i < seats.length; i++) {
        const seatAvailable = new SeatAvailable({
          movieShowingId: movieShowingId,
          seatId: seats[i]._id,
          isAvailable: true,
        });
        seatAvailables.push(seatAvailable);
      }
      const savedSeatAvailables = await SeatAvailable.insertMany(
        seatAvailables
      );
      res.status(201).json({ data: savedSeatAvailables });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Update SeatAvailable
  update(req, res, next) {
    const { seatIds } = req.body; // Nhận danh sách ID ghế cần cập nhật

    SeatAvailable.updateMany(
      { _id: { $in: seatIds } }, // Chọn các ghế có ID trong danh sách
      { $set: { isAvailable: false } } // Cập nhật isAvailable thành false
    )
      .then(() => res.status(200).json({ updatedSeats: seatIds }))
      .catch((error) => res.status(500).json({ message: error.message }));
  }
}

module.exports = new SeatAvailableController();

const Seat = require("../models/Seat");

class SeatController {
  // List of Seats
  async getAll(req, res, next) {
    try {
      const seats = await Seat.find();
      res.status(200).json(seats);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getSeatsByRoomID(req, res, next) {
    const { roomId } = req.params;
    try {
      const seats = await Seat.find({ roomId: roomId });
      res.status(200).json(seats);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Get Seat
  // get(req, res, next) {
  //   res.status(200).json({ data: req.seat });
  // }

  // List of Seats
  // search(req, res, next) {
  //   Seat.find({ name: { $regex: req.params.text, $options: "i" } })
  //     .then((seats) => res.status(200).json({ data: seats }))
  //     .catch((error) => res.status(500).json({ message: error.message }));
  // }

  // Create multiple seats
  async createSeats(req, res, next) {
    const { room, row, column } = req.body;
    
    try {
      const seats = [];
      const rowDivision = Math.ceil(row / 3);
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

      for (let i = 0; i < row; i++) {
        let seatType;
        if (i < rowDivision) {
          seatType = "Standard";
        } else if (i < rowDivision * 2) {
          seatType = "VIP";
        } else {
          seatType = "Premium";
        }

        const rowLabel = alphabet[i % 26];

        for (let j = 0; j < column; j++) {
          const seat = new Seat({
            name: `${rowLabel}${j + 1}`,
            type: seatType,
            roomId: room,
            isDelete: false,
          });
          seats.push(seat);
        }
      }      

      const savedSeats = await Seat.insertMany(seats);
      res.status(201).json({ data: savedSeats });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Update Seat
  update(req, res, next) {
    Seat.updateOne({ _id: req.params.id }, req.body)
      .then(() => res.status(200).json({ _id: req.params.id, data: req.body }))
      .catch((error) => res.status(500).json({ message: error.message }));
  }

  // Delete Seat
  //   delete(req, res, next) {
  //     Seat.deleteOne({ _id: req.params.id })
  //       .then(() =>
  //         res.status(200).json({ message: "Delete Seat Succesfully!" })
  //       )
  //       .catch((error) => res.status(500).json({ message: error.message }));
  //   }
}

module.exports = new SeatController();

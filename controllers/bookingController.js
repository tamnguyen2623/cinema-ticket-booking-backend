const { ProductCode, VnpLocale, dateFormat } = require("vnpay");
const mongoose = require("mongoose");
const { vnpay } = require("../config/vnpayConfig");
const QRCode = require("qrcode");
const { randomUUID } = require("crypto");
const { transporter } = require("../config/mailConfig");
require("dotenv");
const Booking = require("../models/Booking");
const SeatAvailable = require("../models/SeatAvailables");
const Voucher = require("../models/Voucher");
exports.orderByVnPay = async (req, res) => {
  try {
    console.log(" API Received Data:", JSON.stringify(req.body, null, 2));

    let {
      movieName,
      cinema,
      price,
      seats,
      showtime,
      seatsId,
      voucherId,
      room,
      date,
      combo,
      address,
      currency,
    } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const finalPrice = Number(price);
    if (isNaN(finalPrice) || finalPrice <= 0) {
      return res.status(400).json({ message: "Ticket price invalid!" });
    }

    const finalCurrency = currency || "VND";
    const exchangeRate = 240;

    const priceVND =
      finalCurrency === "USD" ? finalPrice * exchangeRate : finalPrice;
    const transactionId = Date.now() + Math.floor(Math.random() * 1000);

    // 🔹 Thêm vào MongoDB
    const newBooking = new Booking({
      user: userId,
      movieName,
      showtime,
      seats,
      address,
      seatsId,
      voucherId,
      price: finalPrice,
      priceVND,
      cinema,
      room,
      combo,
      date,
      transactionId: transactionId.toString(),
      status: "pending",
      currency: finalCurrency,
    });

    await newBooking.save();
    const expireTime = new Date();
    expireTime.setMinutes(expireTime.getMinutes() + 5);

    const paymentUrl = vnpay.buildPaymentUrl({
      vnp_Amount: priceVND * 100,
      vnp_IpAddr: req.socket.remoteAddress || "127.0.0.1",
      vnp_TxnRef: transactionId.toString(),
      vnp_OrderInfo: `Order payment ${transactionId}`,
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: `${process.env.BACKEND_PREFIX}/booking/booking/vnpay/callback`,
      vnp_Locale: VnpLocale.VN,
      vnp_CreateDate: dateFormat(new Date()),
      vnp_ExpireDate: dateFormat(expireTime),
    });
    res.status(200).json({ success: true, paymentUrl });
  } catch (error) {
    console.error("Error orderByVnPay:", error);
    res.status(500).json({ message: "Error server" });
  }
};

exports.callBackVnPay = async (req, res) => {
  try {
    console.log("API (VNPay Callback):", JSON.stringify(req.body, null, 2));

    const { vnp_ResponseCode: code, vnp_TxnRef: transactionId } = req.query;

    if (!transactionId) {
      return res.status(400).send("Transaction ID is invalid.");
    }

    const booking = await Booking.findOne({ transactionId });

    if (!booking) {
      return res.status(404).send("Booking not found.");
    }

    if (code === "00") {
      booking.status = "success";
      booking.paymentTime = new Date();

      try {
        const qrCode = await QRCode.toDataURL(transactionId);
        booking.qrCode = qrCode;
      } catch (qrError) {
        console.error("Error generating QR code:", qrError);
      }

      await booking.save();
      let seatsId = req.body?.seatsId || booking.seatsId;
      if (!seatsId || seatsId.length === 0) {
        console.error("No seats found in booking.");
      } else {
        console.log("Booking success! Updating seat availability...");

        const seatObjectIds = seatsId.map(
          (id) => new mongoose.Types.ObjectId(id)
        );

        const seatsBeforeUpdate = await SeatAvailable.find({
          _id: { $in: seatObjectIds },
        });
        console.log("Seats before update:", seatsBeforeUpdate);

        const updateResult = await SeatAvailable.updateMany(
          { _id: { $in: seatObjectIds } },
          { $set: { isAvailable: false } }
        );

        console.log("Seat update result:", updateResult);
      }
    } else {
      booking.status = "failed";
      await booking.save();
    }

    //  Chỉ cập nhật trạng thái ghế nếu booking có trạng thái "success"
    if (booking.status === "success") {
      let seatsId = req.body?.seatsId || booking.seatsId;
      let voucherId = req.body?.voucherId || booking.voucherId;
      if (!seatsId || seatsId.length === 0) {
        console.error("No seats found in booking.");
      } else {
        console.log("Booking success! Updating seat availability...");

        const seatObjectIds = seatsId.map(
          (id) => new mongoose.Types.ObjectId(id)
        );

        const updateResult = await SeatAvailable.updateMany(
          { _id: { $in: seatObjectIds } },
          { $set: { isAvailable: false } }
        );
        const updateVoucher = await Voucher.updateOne(
          { _id: voucherId },
          { $set: { isUsed: true } }
        );

        console.log("Seat update result:", updateResult);
        console.log("updateVoucher result:", updateVoucher);
      }
    } else {
      console.log(
        "Booking status is not 'success'. Seat availability update skipped."
      );
    }

    const redirectUrl = `${process.env.FRONTEND_PREFIX}/booking/${transactionId}`;
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error("Error in callBackVnPay:", error);
    res.status(500).send("Server error");
  }
};

exports.getBookingByTransactionId = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const booking = await Booking.findOne({ transactionId });

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found!" });
    }

    res.status(200).json({ success: true, booking });
  } catch (error) {
    console.error("Error fetching booking:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
exports.getUserBookings = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log("Fetching bookings for user:", userId);

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu thông tin userId." });
    }

    // Truy vấn các booking của user, sắp xếp theo ngày đặt mới nhất
    const bookings = await Booking.find({ user: userId })
      .select(
        "movieName cinema room showtime date seats price currency status transactionId paymentTime qrCode createdAt updatedAt"
      )
      .sort({ createdAt: -1 });

    if (!bookings.length) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy vé!" });
    }

    res.status(200).json({ success: true, bookings });
  } catch (error) {
    console.error("Lỗi khi lấy vé:", error);

    if (error.name === "CastError") {
      return res
        .status(400)
        .json({ success: false, message: "ID người dùng không hợp lệ." });
    }

    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};


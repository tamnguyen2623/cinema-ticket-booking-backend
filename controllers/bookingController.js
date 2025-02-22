// const crypto = require("crypto");
// const moment = require("moment");
// const querystring = require("qs");
// const Booking = require("../models/Booking"); // Import model Booking

// // Tạo booking
// exports.createBooking = async (req, res) => {
//   try {
//     const { userId, movieShowingId, roomId, seatNumbers, pricePerSeat } =
//       req.body;

//     if (
//       !userId ||
//       !movieShowingId ||
//       !roomId ||
//       !seatNumbers ||
//       seatNumbers.length === 0 ||
//       !pricePerSeat
//     ) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }

//     const totalPrice = seatNumbers.length * pricePerSeat;

//     const newBooking = new Booking({
//       userId,
//       movieShowingId,
//       roomId,
//       seatNumbers,
//       totalPrice,
//     });

//     await newBooking.save();
//     res
//       .status(201)
//       .json({ message: "Booking created successfully", booking: newBooking });
//   } catch (error) {
//     res.status(500).json({ error: "Error creating booking" });
//   }
// };
// // Lấy danh sách booking của người dùng
// exports.getUserBookings = async (req, res) => {
//   try {
//     const bookings = await Booking.find({ userId: req.params.userId });
//     res.status(200).json({ bookings });
//   } catch (error) {
//     res.status(500).json({ error: "Error fetching bookings" });
//   }
// };

// // Xử lý thanh toán VNPAY
// exports.processPayment = async (req, res) => {
//   try {
//     const { amount, orderId } = req.body;
//     const vnp_Params = {
//       vnp_Version: "2.1.0",
//       vnp_Command: "pay",
//       vnp_TmnCode: process.env.VNP_TMN_CODE,
//       vnp_Amount: amount * 100,
//       vnp_CurrCode: "VND",
//       vnp_TxnRef: orderId,
//       vnp_OrderInfo: "Payment for booking",
//       vnp_Locale: "vn",
//       vnp_ReturnUrl: process.env.VNP_RETURN_URL,
//       vnp_IpAddr: req.ip,
//       vnp_CreateDate: moment().format("YYYYMMDDHHmmss"),
//     };

//     const hmac = crypto.createHmac("sha512", process.env.VNP_HASH_SECRET);
//     const signed = hmac
//       .update(querystring.stringify(vnp_Params, { encode: false }))
//       .digest("hex");
//     vnp_Params["vnp_SecureHash"] = signed;

//     const vnpUrl = `${process.env.VNP_URL}?${querystring.stringify(
//       vnp_Params
//     )}`;
//     res.status(200).json({ vnpUrl });
//   } catch (error) {
//     res.status(500).json({ error: "Error processing payment" });
//   }
// };

// // Xác nhận thanh toán từ VNPAY
// exports.verifyPayment = async (req, res) => {
//   try {
//     const vnp_Params = req.query;
//     const secureHash = vnp_Params["vnp_SecureHash"];
//     delete vnp_Params["vnp_SecureHash"];
//     delete vnp_Params["vnp_SecureHashType"];

//     const hmac = crypto.createHmac("sha512", process.env.VNP_HASH_SECRET);
//     const signed = hmac
//       .update(querystring.stringify(vnp_Params, { encode: false }))
//       .digest("hex");

//     if (secureHash === signed) {
//       await Booking.findOneAndUpdate(
//         { _id: vnp_Params["vnp_TxnRef"] },
//         { status: vnp_Params["vnp_ResponseCode"] === "00" ? "paid" : "failed" }
//       );
//       res.status(200).json({ message: "Payment processed successfully" });
//     } else {
//       res.status(400).json({ error: "Invalid signature" });
//     }
//   } catch (error) {
//     res.status(500).json({ error: "Error verifying payment" });
//   }
// };

const { ProductCode, VnpLocale, dateFormat } = require("vnpay");
const User = require("../models/User");
const Order = require("../models/Order");
const { vnpay } = require("../config/vnpayConfig");
const Showtime = require("../models/Showtime");
const QRCode = require("qrcode");
const { randomUUID } = require("crypto");
const { transporter } = require("../config/mailConfig");
require("dotenv");

// exports.orderByVnPay = async (req, res) => {
//   try {
//     const { price, seats, showtime } = req.body;

//     // Kiểm tra dữ liệu đầu vào
//     if (!price || !seats || !showtime) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Thiếu dữ liệu!" });
//     }

//     // Tạo thời gian hết hạn
//     const expireTime = new Date();
//     expireTime.setMinutes(expireTime.getMinutes() + 5);

//     const transactionId = Date.now() + Math.floor(Math.random() * 1000);
//     const paymentUrl = vnpay.buildPaymentUrl({
//       vnp_Amount: price * 100, // VNPay yêu cầu đơn vị VND x 100
//       vnp_IpAddr:
//         req.headers["x-forwarded-for"] ||
//         req.socket.remoteAddress ||
//         "127.0.0.1",
//       vnp_TxnRef: transactionId.toString(),
//       vnp_OrderInfo: `Thanh toán đơn hàng ${transactionId}`,
//       vnp_OrderType: ProductCode.Other,
//       vnp_ReturnUrl:
//         process.env.BACKEND_PREFIX + "/booking/booking/vnpay/callback",
//       vnp_Locale: VnpLocale.VN,
//       vnp_CreateDate: dateFormat(new Date()),
//       vnp_ExpireDate: dateFormat(expireTime),
//     });

//     console.log("✅ URL thanh toán:", paymentUrl);

//     // Trả URL về Frontend
//     res.status(200).json({
//       success: true,
//       paymentUrl: paymentUrl,
//     });
//   } catch (error) {
//     console.error("❌ Lỗi tạo URL VNPay:", error);
//     res.status(500).json({ success: false, message: "Lỗi server" });
//   }
// };

// // API xử lý callback từ VNPAY sau khi thanh toán
// exports.callBackVnPay = async (req, res) => {
//   try {
//     const code = req.query.vnp_ResponseCode; // Mã kết quả giao dịch
//     const orderId = req.query.vnp_TxnRef; // Mã đơn hàng bạn đã tạo trước đó

//     // Tìm đơn hàng với orderId
//     const order = await Order.findById(orderId)
//       .populate("user")
//       .populate("showtime");

//     if (!order) {
//       return res.status(404).send("❌ Không tìm thấy đơn hàng.");
//     }

//     if (code === "00") {
//       // Thanh toán thành công
//       const ticketId = randomUUID();
//       const qr = await QRCode.toDataURL(ticketId);

//       // Cập nhật trạng thái đơn hàng
//       order.status = "done";
//       await order.save();

//       // Cập nhật thông tin vé cho người dùng
//       await User.findByIdAndUpdate(order.user._id, {
//         $push: {
//           tickets: {
//             showtime: order.showtime,
//             seats: order.seats,
//             price: order.price,
//             qr: qr,
//             ticketId: ticketId,
//           },
//         },
//       });

//       // Gửi email xác nhận cho khách hàng
//       await transporter.sendMail({
//         from: process.env.MAIL_SENDER,
//         to: order.user.email,
//         subject: "🎟️ Xác nhận đặt vé thành công",
//         html: `<h3>Xin chào ${order.user.fullname},</h3>
//                <p>Bạn đã đặt vé thành công cho bộ phim <strong>${
//                  order.showtime.movie.name
//                }</strong>.</p>
//                <p>🔹 Rạp: ${order.showtime.theater.cinema.name}</p>
//                <p>🕒 Suất chiếu: ${order.showtime.showtime}</p>
//                <p>💺 Ghế: ${order.seats.join(", ")}</p>
//                <p>💰 Số tiền: ${order.price} VND</p>
//                <img src="${qr}" alt="QR Code" />`,
//       });

//       console.log("✅ Thanh toán thành công!");
//     } else {
//       // Thanh toán thất bại
//       order.status = "cancelled";
//       await order.save();
//       console.log("❌ Thanh toán thất bại.");
//     }

//     // Chuyển hướng người dùng về kết quả thanh toán
//     res.redirect(`${process.env.FRONTEND_PREFIX}/payment-result/${code}`);
//   } catch (error) {
//     console.error("🚨 Lỗi trong callBackVnPay:", error);
//     res.status(500).send("Internal Server Error");
//   }
// };
const mongoose = require("mongoose");

// ==========================
// 🛠️ TẠO URL THANH TOÁN VNPAY 🛠️
// ==========================
// exports.orderByVnPay = async (req, res) => {
//   try {
//     const { price, seats, showtime } = req.body;

//     // Kiểm tra dữ liệu đầu vào
//     if (!price || !seats || !showtime) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Thiếu dữ liệu!" });
//     }

//     // Tạo thời gian hết hạn
//     const expireTime = new Date();
//     expireTime.setMinutes(expireTime.getMinutes() + 5);

//     const transactionId = Date.now() + Math.floor(Math.random() * 1000);
//     const paymentUrl = vnpay.buildPaymentUrl({
//       vnp_Amount: price * 100, // VNPay yêu cầu đơn vị VND x 100
//       vnp_IpAddr:
//         req.headers["x-forwarded-for"] ||
//         req.socket.remoteAddress ||
//         "127.0.0.1",
//       vnp_TxnRef: transactionId.toString(),
//       vnp_OrderInfo: `Thanh toán đơn hàng ${transactionId}`,
//       vnp_OrderType: ProductCode.Other,
//       vnp_ReturnUrl:
//         process.env.BACKEND_PREFIX + "/booking/booking/vnpay/callback",
//       vnp_Locale: VnpLocale.VN,
//       vnp_CreateDate: dateFormat(new Date()),
//       vnp_ExpireDate: dateFormat(expireTime),
//     });

//     console.log("✅ URL thanh toán:", paymentUrl);

//     // Trả URL về Frontend
//     res.status(200).json({
//       success: true,
//       paymentUrl: paymentUrl,
//     });
//   } catch (error) {
//     console.error("❌ Lỗi tạo URL VNPay:", error);
//     res.status(500).json({ success: false, message: "Lỗi server" });
//   }
// };
const Booking = require("../models/Booking");

exports.orderByVnPay = async (req, res) => {
  try {
    const { price, seats, showtime } = req.body;
    const userId = req.user._id;

    // Kiểm tra dữ liệu đầu vào
    if (!price || isNaN(price) || price < 1000) {
      return res.status(400).json({ message: "Giá trị `price` không hợp lệ!" });
    }

    if (!showtime || typeof showtime !== "string") {
      return res
        .status(400)
        .json({ message: "Giá trị `showtime` không hợp lệ!" });
    }

    const seatArray = seats.split(",").map((seat) => seat.trim());

    // Tạo một booking mới
    const transactionId = Date.now() + Math.floor(Math.random() * 1000);
    const newBooking = new Booking({
      user: userId,
      showtime: showtime, // Lưu dưới dạng string
      seats: seatArray,
      price: price,
      transactionId: transactionId.toString(),
      status: "pending",
    });

    await newBooking.save();

    // Tạo URL thanh toán cho VNPay
    const expireTime = new Date();
    expireTime.setMinutes(expireTime.getMinutes() + 5);
    const paymentUrl = vnpay.buildPaymentUrl({
      vnp_Amount: price * 100,
      vnp_IpAddr: req.socket.remoteAddress || "127.0.0.1",
      vnp_TxnRef: transactionId.toString(),
      vnp_OrderInfo: `Thanh toán đơn hàng ${transactionId}`,
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: `${process.env.BACKEND_PREFIX}/booking/booking/vnpay/callback`,
      vnp_Locale: VnpLocale.VN,
      vnp_CreateDate: dateFormat(new Date()),
      vnp_ExpireDate: dateFormat(expireTime),
    });

    console.log("✅ URL thanh toán:", paymentUrl);

    res.status(200).json({ success: true, paymentUrl });
  } catch (error) {
    console.error("❌ Lỗi trong orderByVnPay:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};
// ==========================
// 🔄 XỬ LÝ CALLBACK TỪ VNPAY 🔄
// ==========================
// 📲 Xử lý callback từ VNPay
// exports.callBackVnPay = async (req, res) => {
//   try {
//     const code = req.query.vnp_ResponseCode;
//     const transactionId = req.query.vnp_TxnRef;

//     console.log(
//       `🔍 VNPay callback: Đơn hàng ${transactionId} - Mã trạng thái: ${code}`
//     );

//     // Tìm booking dựa trên transactionId
//     const booking = await Booking.findOne({ transactionId }).populate("user");

//     if (!booking) {
//       console.error("⚠️ Không tìm thấy booking.");
//       return res.status(404).send("Không tìm thấy booking.");
//     }

//     if (code === "00") {
//       // Thanh toán thành công
//       booking.status = "success";

//       // Tạo mã QR cho vé
//       const qr = await QRCode.toDataURL(transactionId);
//       booking.qrCode = qr;

//       await booking.save();

//       console.log("✅ Thanh toán thành công!");
//     } else {
//       booking.status = "failed";
//       await booking.save();
//       console.log("❌ Thanh toán thất bại.");
//     }

//     // Chuyển hướng người dùng đến kết quả thanh toán
//     return res.redirect(
//       `${process.env.FRONTEND_PREFIX}/payment-result/${code}`
//     );
//   } catch (error) {
//     console.error("🚨 Lỗi trong callBackVnPay:", error);
//     res.status(500).send("Internal Server Error");
//   }
// };

exports.callBackVnPay = async (req, res) => {
  try {
    const { vnp_ResponseCode: code, vnp_TxnRef: transactionId } = req.query;

    if (!transactionId) {
      console.error("⚠️ transactionId không hợp lệ!");
      return res.status(400).send("❌ transactionId không hợp lệ.");
    }

    console.log(
      `🔍 VNPay callback: Đơn hàng ${transactionId} - Mã trạng thái: ${code}`
    );

    // 🛒 Tìm đơn hàng trong Booking
    const booking = await Booking.findOne({ transactionId });
    if (!booking) {
      console.error(
        `⚠️ Không tìm thấy đơn hàng với transactionId: ${transactionId}`
      );
      return res.status(404).send("❌ Không tìm thấy đơn hàng.");
    }

    // 🔍 Kiểm tra kết quả thanh toán từ VNPay
    if (code === "00") {
      // ✅ Thanh toán thành công
      booking.status = "success";
      booking.paymentTime = new Date();

      // 🎯 Tạo mã QR từ transactionId
      try {
        const qrCode = await QRCode.toDataURL(transactionId);
        booking.qrCode = qrCode;
        await booking.save();
        console.log("✅ Thanh toán thành công và QR code đã được cập nhật.");
      } catch (qrError) {
        console.error("🚨 Lỗi khi tạo mã QR:", qrError);
        return res.status(500).send("❌ Lỗi khi tạo mã QR.");
      }
    } else {
      // ❌ Thanh toán thất bại
      booking.status = "failed";
      await booking.save();
      console.log("❌ Thanh toán thất bại.");
    }

    // 🔄 Chuyển hướng về frontend với transactionId
    const redirectUrl = `${process.env.FRONTEND_PREFIX}/booking/${transactionId}`;
    console.log(`🔍 Chuyển hướng tới: ${redirectUrl}`);
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error("🚨 Lỗi trong callBackVnPay:", error);
    res.status(500).send("Internal Server Error");
  }
};

// controllers/bookingController.js
exports.getBookingByTransactionId = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const booking = await Booking.findOne({ transactionId });

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy booking!" });
    }

    res.status(200).json({ success: true, booking });
  } catch (error) {
    console.error("🚨 Lỗi khi lấy booking:", error);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

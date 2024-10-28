const { ProductCode, VnpLocale, dateFormat } = require("vnpay");
const User = require("../models/User");
const Order = require("../models/Order");
const { vnpay } = require("../config/vnpayConfig");
const Showtime = require("../models/Showtime");
const QRCode = require("qrcode");
const { randomUUID } = require("crypto");

// API xử lý đơn hàng
exports.orderByVnPay = async (order, req) => {
  const expireTime = new Date();
  expireTime.setMinutes(expireTime.getMinutes() + 1);

  const paymentUrl = vnpay.buildPaymentUrl({
    vnp_Amount: order.price,
    vnp_IpAddr:
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.ip,
    vnp_TxnRef: order._id,
    vnp_OrderInfo: "Thanh toan don hang 12345",
    vnp_OrderType: ProductCode.Other,
    vnp_ReturnUrl: "http://localhost:8080/call-back/vnpay",
    vnp_Locale: VnpLocale.VN, // 'vn' hoặc 'en'
    vnp_CreateDate: dateFormat(new Date()), // tùy chọn, mặc định là hiện tại
    vnp_ExpireDate: dateFormat(expireTime), // tùy chọn
  });

  return paymentUrl;
};

exports.callBackVnPay = async (req, res, next) => {
  try {
    const code = req.query.vnp_ResponseCode;
    const orderId = req.query.vnp_TxnRef;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).send("Order not found.");
    }

    switch (code) {
      case "00":
        const ticketId = randomUUID();
        console.log(ticketId);
        let qr = await QRCode.toDataURL(ticketId);
        console.log(qr);

        const updatedUser = await User.findByIdAndUpdate(
          order.user._id,
          {
            $push: {
              tickets: {
                showtime: order.showtime,
                seats: order.seats,
                price: order.price,
                qr: qr,
                ticketId: ticketId,
              },
            },
          },
          { new: true }
        );

        await Order.findByIdAndUpdate(order._id, { status: "done" });
        break;
      default:
        const showtime = await Showtime.findById(order.showtime);
        console.log(showtime);
        if (!showtime) {
          code = "1000";
        }

        showtime.seats = showtime.seats.filter(
          (seat) =>
            !order.seats.some(
              (orderSeat) =>
                seat.row === orderSeat.row &&
                seat.number === orderSeat.number &&
                seat.user?.toString() === order.user.toString()
            )
        );

        await showtime.save();
    }

    const showtime = await Showtime.findById(order.showtime._id);
    res.redirect(`http://localhost:5173/showtime/${showtime._id}/${code}`);
  } catch (error) {
    console.error("Error in callBackVnPay:", error);
    res.status(500).send("Internal Server Error");
  }
};

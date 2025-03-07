const { ProductCode, VnpLocale, dateFormat } = require("vnpay");
const mongoose = require("mongoose");
const { vnpay } = require("../config/vnpayConfig");
const QRCode = require("qrcode");
require("dotenv");
const Booking = require("../models/Booking");
const SeatAvailable = require("../models/SeatAvailables");
const Voucher = require("../models/Voucher");
exports.orderByVnPay = async (req, res) => {
  try {
    console.log(" API Received Data:", JSON.stringify(req.body, null, 2));

    let {
      movieName,
      movieId,
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
    let discount = req.body.discount || 0;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    // voucherId = req.body.voucherId || null; // Lấy từ request
    console.log("Voucher ID from request:", voucherId);
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
      movieId,
      movieName,
      showtime,
      seats,
      address,
      seatsId,
      voucherId,
      discount,
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
        let updateVoucher = null; // Khai báo trước

        if (voucherId && mongoose.Types.ObjectId.isValid(voucherId)) {
          updateVoucher = await Voucher.updateOne(
            { _id: new mongoose.Types.ObjectId(voucherId) },
            { $set: { isUsed: true } }
          );
          console.log("Voucher update result:", updateVoucher);
        } else {
          console.log("Skipping voucher update, invalid voucherId:", voucherId);
        }

        // Chỉ log nếu updateVoucher có giá trị
        if (updateVoucher) {
          console.log("updateVoucher result:", updateVoucher);
        }

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

// Hiển thị vé sau khi thanh toán thành công
exports.getBookingByTransactionId = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const booking = await Booking.findOne({ transactionId });

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Not find booking!" });
    }

    res.status(200).json({ success: true, booking });
  } catch (error) {
    console.error("Error booking:", error);
    res.status(500).json({ success: false, message: "Error server" });
  }
};

// Lấy danh sách vé của người dùng đã đặt

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
    const bookings = await Booking.find({ user: userId }).sort({
      createdAt: -1,
    });

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

// Update booking
exports.update = (req, res, next) => {
  Booking.updateOne({ _id: req.params.id }, req.body)
    .then(() => res.status(200).json({ _id: req.params.id, data: req.body }))
    .catch((error) => res.status(500).json({ message: error.message }));
  };

exports.getAllBooks = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("user", "fullname email roleId") // Hiển thị fullname, email, role
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.bookingByMomo = async (req, res, next) => {
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
    let discount = req.body.discount || 0;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    console.log("Voucher ID from request:", voucherId);
    const finalPrice = Number(price);
    if (isNaN(finalPrice) || finalPrice <= 0) {
      return res.status(400).json({ message: "Ticket price invalid!" });
    }

    const finalCurrency = currency || "VND";
    const exchangeRate = 24000;

    const priceVND =
      finalCurrency === "USD" ? finalPrice * exchangeRate : finalPrice;
    const transactionId = Date.now() + Math.floor(Math.random() * 1000);

    const newBooking = new Booking({
      user: userId,
      movieName,
      showtime,
      seats,
      address,
      seatsId,
      voucherId,
      discount,
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
    var accessKey = process.env.MOMO_ACCESS_KEY;
    var secretKey = process.env.MOMO_SECRET_KEY;
    var orderInfo = "Your order id is " + transactionId + ", total price is " + priceVND + " VND";
    var partnerCode = "MOMO";
    var redirectUrl = process.env.BACKEND_PREFIX + `/booking/booking/momo/callback`;
    var ipnUrl = process.env.BACKEND_PREFIX + "/booking/booking/momo/callback";
    var requestType = "payWithCC";
    var amount = priceVND+"";
    var orderId = transactionId.toString();
    var requestId = orderId;
    var extraData = "";
    var paymentCode = process.env.MOMO_PAYMENT_CODE;
    var orderGroupId = "";
    var autoCapture = true;
    var lang = "en";

    //before sign HMAC SHA256 with format
    //accessKey=$accessKey&amount=$amount&extraData=$extraData&ipnUrl=$ipnUrl&orderId=$orderId&orderInfo=$orderInfo&partnerCode=$partnerCode&redirectUrl=$redirectUrl&requestId=$requestId&requestType=$requestType
    var rawSignature =
      "accessKey=" +
      accessKey +
      "&amount=" +
      amount +
      "&extraData=" +
      extraData +
      "&ipnUrl=" +
      ipnUrl +
      "&orderId=" +
      orderId +
      "&orderInfo=" +
      orderInfo +
      "&partnerCode=" +
      partnerCode +
      "&redirectUrl=" +
      redirectUrl +
      "&requestId=" +
      requestId +
      "&requestType=" +
      requestType;

    const crypto = require("crypto");
    var signature = crypto
      .createHmac("sha256", secretKey)
      .update(rawSignature)
      .digest("hex");

    const requestBody = JSON.stringify({
      partnerCode: partnerCode,
      partnerName: "CINEMA",
      storeId: "MomoTestStore",
      requestId: requestId,
      amount: amount,
      orderId: orderId,
      orderInfo: orderInfo,
      redirectUrl: redirectUrl,
      ipnUrl: ipnUrl,
      lang: lang,
      requestType: requestType,
      autoCapture: autoCapture,
      extraData: extraData,
      orderGroupId: orderGroupId,
      signature: signature,
    });

    const https = require("https");
    const options = {
      hostname: process.env.MOMO_HOST,
      port: 443,
      path: process.env.MOMO_PATH,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(requestBody),
      },
    };
    
    const req1 = https.request(options, (res1) => {
      res1.setEncoding("utf8");
      res1.on("data", (body) => {
        res.json({ success: true, paymentUrl: JSON.parse(body).payUrl });
      });
      res1.on("end", () => {
        console.log("No more data in response.");
      });
    });

    req1.on("error", (e) => {
      console.log(`problem with request: ${e.message}`);
    });

    req1.write(requestBody);
    req1.end();
  } catch (error) {
    console.error("Error orderByVnPay:", error);
    res.status(500).json({ message: "Error server" });
  }
};

exports.callbackMomo = async (req, res) => {
  try {

    const { resultCode: code, orderId: transactionId } = req.query;

    if (!transactionId) {
      return res.status(400).send("Transaction ID is invalid.");
    }

    const booking = await Booking.findOne({ transactionId });

    if (!booking) {
      return res.status(404).send("Booking not found.");
    }

    if (code === "0") {
      booking.status = "success";
      booking.paymentTime = new Date();

      try {
        const qrCode = await QRCode.toDataURL(transactionId);
        booking.qrCode = qrCode;
      } catch (qrError) {
        console.error("Error generating QR code:", qrError);
      }

      await booking.save();
    } else {
      booking.status = "failed";
      await booking.save();
    }

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
        let updateVoucher = null;

        if (voucherId && mongoose.Types.ObjectId.isValid(voucherId)) {
          updateVoucher = await Voucher.updateOne(
            { _id: new mongoose.Types.ObjectId(voucherId) },
            { $set: { isUsed: true } }
          );
          console.log("Voucher update result:", updateVoucher);
        } else {
          console.log("Skipping voucher update, invalid voucherId:", voucherId);
        }

        if (updateVoucher) {
          console.log("updateVoucher result:", updateVoucher);
        }

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

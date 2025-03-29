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
const Movie = require("../models/Movie");
const OwningCard = require("../models/OwningCard");

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

    // 🔹 Tìm phim theo `name` để lấy `img`
    const movie = await Movie.findOne({ name: movieName }).select("img");
    const movieImage = movie?.img;

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
      movieImage, // Lưu ảnh phim
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
        const user = await mongoose
          .model("User")
          .findById(booking.user)
          .select("email");

        if (user?.email) {
          await sendConfirmationEmail(user.email, booking);
        }

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

    const bookings = await Booking.find({
      user: userId,
      status: "success",
    }).sort({ createdAt: -1 });

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
// tính tiền các vẽ đã thanh toán thành công
exports.getTotal = async (req, res, next) => {
  try {
    const { userId } = req.params;
    console.log("Fetching bookings for user:", userId);

    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu thông tin userId." });
    } /// Tìm các đơn hàng thành công
    const bookings = await Booking.find({ user: userId, status: "success" });

    // Tính tổng số tiền
    const totalSpent = bookings.reduce(
      (sum, booking) => sum + booking.price,
      0
    );

    // ✅ Phải gửi phản hồi JSON cho API
    res.json({ success: true, userId, totalSpent });
  } catch (error) {
    console.error("Lỗi khi tính tổng tiền:", error);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
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
      movieId,
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
    const movie = await Movie.findById(movieId);
    const newBooking = new Booking({
      user: userId,
      movieName,
      movieId,
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
      movieImage: movie?.img,
      combo,
      date,
      transactionId: transactionId.toString(),
      status: "pending",
      currency: finalCurrency,
    });

    await newBooking.save();
    const expireTime = new Date();
    expireTime.setMinutes(expireTime.getMinutes() + 10);
    var accessKey = process.env.MOMO_ACCESS_KEY;
    var secretKey = process.env.MOMO_SECRET_KEY;
    var orderInfo =
      "Your order id is " +
      transactionId +
      ", total price is " +
      priceVND +
      " VND";
    var partnerCode = "MOMO";
    var redirectUrl =
      process.env.BACKEND_PREFIX + `/booking/booking/momo/callback`;
    var ipnUrl = process.env.BACKEND_PREFIX + "/booking/booking/momo/callback";
    var requestType = "payWithCC";
    var amount = priceVND + "";
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
    if (booking.user?.email) {
      await sendConfirmationEmail(booking.user.email, booking);
    }

    const redirectUrl = `${process.env.FRONTEND_PREFIX}/booking/${transactionId}`;
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error("Error in callBackVnPay:", error);
    res.status(500).send("Server error");
  }
};

exports.getTicketByBookingId = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!bookingId) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu bookingId!" });
    }

    const booking = await Booking.findOne({ _id: bookingId })
      .populate("user", "fullname email")
      .populate("voucherId", "discount code");

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy vé!" });
    }

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const sendConfirmationEmail = async (email, booking) => {
  try {
    // Lấy thông tin người dùng từ booking
    const user = await mongoose
      .model("User")
      .findById(booking.user)
      .select("fullname");
    const fullname = user?.fullname || "Khách hàng";
    const voucher = await mongoose
      .model("Voucher")
      .findById(booking.voucherId)
      .select("discount");
    const discount = voucher?.discount || 0;
    // Chuyển đổi thời gian về múi giờ địa phương
    const localTime = new Date(booking.showtime).toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false, // Hiển thị 24h thay vì AM/PM
    });
    const mailOptions = {
      from: process.env.MAIL_ACCOUNT,
      to: email,
      subject: "Booking Confirmation - Your Ticket Details",
      html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
 <div style="text-align: center; background-color:rgb(1, 38, 248); padding: 10px; border-radius: 8px;">
 <h2 style="color:rgb(220, 224, 228); text-align: center; font-weight: bold;">Hello, ${fullname}!</h2>
 <p style="text-align: center; font-size: 16px;color:rgb(220, 224, 228)">Your movie ticket has been successfully booked. Below are the details:</p>
 </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;font-size: 15px">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Movie:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${
            booking.movieName
          }</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Cinema:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${
            booking.cinema
          }</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Showtime:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${localTime}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Date:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${new Date(
            booking.date
          ).toLocaleDateString("en-GB")}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Seat(s):</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${booking.seats.join(
            ", "
          )}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Room:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${
            booking.room
          }</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Price:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${
            booking.price
          } ${booking.currency}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Payment time:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${
            booking.paymentTime
          } </td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Combo:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${
            booking.combo || "No Combo"
          }</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Voucher Discount:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${discount}%</td>
        </tr>
      </table>

      <p style="text-align: center; font-size: 16px; margin-top: 20px;">Thank you for booking with us! </p>
    </div>
  `,
    };

    await transporter.sendMail(mailOptions);
    console.log("Email xác nhận gửi thành công!");
  } catch (error) {
    console.error("Lỗi gửi email xác nhận:", error);
  }
};

exports.bookingByEgiftCard = async (req, res, next) => {
  let {
    movieName,
    cinema,
    price,
    movieId,
    seats,
    showtime,
    seatsId,
    voucherId,
    room,
    date,
    combo,
    address,
    currency,
    cardNumber,
    pin,
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

  const owningCard = await OwningCard.findOne({ cardNumber });
  if (!owningCard) {
    return res.status(400).json({ message: "Card not found!" });
  }
  if (owningCard.pin !== pin) {
    return res.status(400).json({ message: "Invalid pin!" });
  }
  if (owningCard.inactive) {
    return res.status(400).json({ message: "Card is inactive!" });
  }
  if (owningCard.balance < finalPrice) {
    return res.status(400).json({ message: "Not enough balance!" });
  }
  owningCard.balance -= finalPrice;
  await owningCard.save();

  const transactionId = Date.now() + Math.floor(Math.random() * 1000);
  const movie = await Movie.findById(movieId);
  const newBooking = new Booking({
    user: userId,
    movieName,
    movieId,
    movieImage: movie?.img,
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
    status: "success",
    currency: finalCurrency,
  });
  newBooking.status = "success";
  newBooking.paymentTime = new Date();

  try {
    const qrCode = await QRCode.toDataURL(transactionId.toString());
    newBooking.qrCode = qrCode;
  } catch (qrError) {
    console.error("Error generating QR code:", qrError);
  }

  try {
    await newBooking.save();
  } catch (error) {
    owningCard.balance += finalPrice;
    await owningCard.save();
    res.status(500).json({ message: "Error server" });
  }
  try {
    let seatsId = req.body?.seatsId || newBooking.seatsId;
    let voucherId = req.body?.voucherId || newBooking.voucherId;
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

    if (newBooking.user?.email) {
      await sendConfirmationEmail(newBooking.user?.email, newBooking);
    }
    return res.json({success: true, message: "Booking successful!"});
  } catch (error) {
    console.error("Error in callBackVnPay:", error);
    newBooking.status = "failed";
    await newBooking.save();
    owningCard.balance += finalPrice;
    await owningCard.save();
    res.status(500).send("Server error");
  }
};

// Update booking
exports.update = (req, res, next) => {
  Booking.updateOne({ _id: req.params.id }, req.body)
    .then(() => res.status(200).json({ _id: req.params.id, data: req.body }))
    .catch((error) => res.status(500).json({ message: error.message }));
};

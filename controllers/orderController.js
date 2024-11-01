const { ProductCode, VnpLocale, dateFormat } = require("vnpay");
const User = require("../models/User");
const Order = require("../models/Order");
const { vnpay } = require("../config/vnpayConfig");
const Showtime = require("../models/Showtime");
const QRCode = require("qrcode");
const { randomUUID } = require("crypto");
const ExcelJS = require("exceljs");
const { transporter } = require("../config/mailConfig");

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
    const order = await Order.findById(orderId)
      .populate({
        path: "showtime",
        populate: [
          "movie",
          {
            path: "theater",
            populate: { path: "cinema", select: "name" },
            select: "cinema number",
          },
        ],
      })
      .populate({
        path: "user",
      });
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

        const user = updatedUser;
        const seats = order.seats
          .map((seat) => `${seat.row}${seat.number}`)
          .join(", ");
        const showtimeDate = formatDateToUTC7NoSec(order.showtime.showtime);
        const movieName = order.showtime.movie.name;
        const theaterName = order.showtime.theater.number;
        const cinemaName = order.showtime.theater.cinema.name;

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="background-color: #007bff; color: white; padding: 10px;">You have successfully purchased your ticket!</h2>
            <p>Dear <strong>${user.fullname}</strong>,</p>
            <p>You have successfully purchased your ticket. Here are the details:</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <tr><td><strong>Mã vé:</strong></td><td>${ticketId}</td></tr>
              <tr><td><strong>Phim:</strong></td><td>${movieName}</td></tr>
              <tr><td><strong>Rạp:</strong></td><td>${cinemaName}</td></tr>
              <tr><td><strong>Rạp số:</strong></td><td>${theaterName}</td></tr>
              <tr><td><strong>Ngày chiếu:</strong></td><td>${showtimeDate}</td></tr>
              <tr><td><strong>Ghế:</strong></td><td>${seats}</td></tr>
              <tr><td><strong>Giá vé:</strong></td><td>${
                order.price
              } VND</td></tr>
            </table>
            <p style="margin-top: 20px;">See more detail and QR code of ticket at:</p>
            <div style="text-align: center;">
              <a class="btn-primary"
                                           style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 20px; color: #FFF; text-decoration: none; line-height: 2em; font-weight: bold; text-align: center; cursor: pointer; display: inline-block; border-radius: 7px; text-transform: capitalize; background-color: #f1556c; margin: 0; border-color: #f1556c; border-style: solid; border-width: 10px 20px;
          padding: 10px 20px;"
                                           href="${
                                             process.env.FRONTEND_PREFIX +
                                             "/ticket"
                                           }">
                                            Detail</a>
            </div>
            

            <p style="color: #555;">Thank you for purchasing tickets at our system.</p>
          </div>`;
        console.log(emailHtml.toString());
        await transporter.sendMail({
          from: '"GROUP01 CI NÊ MA" group01se1709@gmail.com',
          to: user.email,
          subject: "Confirm ticket purchase successful!",
          html: emailHtml,
        });
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

        await Order.findByIdAndUpdate(order._id, { status: "cancelled" });

        await showtime.save();
    }

    const showtime = await Showtime.findById(order.showtime._id);
    res.redirect(`http://localhost:5173/showtime/${showtime._id}/${code}`);
  } catch (error) {
    console.error("Error in callBackVnPay:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate({
        path: "showtime",
        populate: [
          "movie",
          {
            path: "theater",
            populate: { path: "cinema", select: "name" },
            select: "cinema number",
          },
        ],
      })
      .populate({
        path: "user",
      });

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err });
  }
};

function formatDateToUTC7(dateString) {
  const date = new Date(dateString);

  const adjustedDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);

  const hours = String(adjustedDate.getUTCHours()).padStart(2, "0");
  const minutes = String(adjustedDate.getUTCMinutes()).padStart(2, "0");
  const seconds = String(adjustedDate.getUTCSeconds()).padStart(2, "0");
  const day = String(adjustedDate.getUTCDate()).padStart(2, "0");
  const month = String(adjustedDate.getUTCMonth() + 1).padStart(2, "0");
  const year = adjustedDate.getUTCFullYear();

  return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
}
function formatDateToUTC7NoSec(dateString) {
  const date = new Date(dateString);

  const adjustedDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);

  const hours = String(adjustedDate.getUTCHours()).padStart(2, "0");
  const minutes = String(adjustedDate.getUTCMinutes()).padStart(2, "0");
  const seconds = String(adjustedDate.getUTCSeconds()).padStart(2, "0");
  const day = String(adjustedDate.getUTCDate()).padStart(2, "0");
  const month = String(adjustedDate.getUTCMonth() + 1).padStart(2, "0");
  const year = adjustedDate.getUTCFullYear();

  return `${hours}:${minutes} ${day}/${month}/${year}`;
}

const setupWorksheet = (workbook) => {
  const worksheet = workbook.addWorksheet("Orders");
  worksheet.columns = [
    { header: "Username", key: "username", width: 20 },
    { header: "Fullname", key: "fullname", width: 20 },
    { header: "Email", key: "email", width: 30 },
    { header: "Movie", key: "movie", width: 30 },
    { header: "Cinema", key: "cinema", width: 20 },
    { header: "Theater", key: "theater", width: 10 },
    { header: "Seats", key: "seats", width: 10 },
    { header: "Total Price", key: "price", width: 15 },
    { header: "Method", key: "method", width: 10 },
    { header: "Date", key: "date", width: 20 },
    { header: "Status", key: "status", width: 15 },
  ];

  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0070C0" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  return worksheet;
};

const addOrdersToWorksheet = (worksheet, orders) => {
  orders.forEach((order) => {
    worksheet.addRow({
      username: order.user.username,
      fullname: order.user.fullname,
      email: order.user.email,
      movie: order.showtime.movie.name,
      cinema: order.showtime.theater.cinema.name,
      theater: order.showtime.theater.number,
      seats: order.seats.map((seat) => seat.row + seat.number).join(", "),
      price: order.price,
      method: order.method,
      date: formatDateToUTC7(order.createdAt),
      status: order.status,
    });
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: rowNumber % 2 === 0 ? "FFEEEEEE" : "FFFFFFFF" },
        };
      });
    }
  });
};

exports.exportOrdersToExcelFile = async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    let orders = [];
    if (startDate && endDate) {
      let start = new Date(startDate);
      let end = new Date(endDate);
      end.setDate(end.getDate() + 1);

      if (isNaN(start) || isNaN(end)) {
        return res.status(400).send("Invalid date range");
      }

      orders = await Order.find({
        createdAt: { $gte: start, $lte: end },
      })
        .populate({
          path: "showtime",
          populate: [
            "movie",
            {
              path: "theater",
              populate: { path: "cinema", select: "name" },
              select: "cinema number",
            },
          ],
        })
        .populate({ path: "user" });
    } else if (startDate && !endDate) {
      let start = new Date(startDate);

      if (isNaN(start)) {
        return res.status(400).send("Invalid date range");
      }

      orders = await Order.find({
        createdAt: { $gte: start },
      })
        .populate({
          path: "showtime",
          populate: [
            "movie",
            {
              path: "theater",
              populate: { path: "cinema", select: "name" },
              select: "cinema number",
            },
          ],
        })
        .populate({ path: "user" });
    } else if (!startDate && endDate) {
      let end = new Date(endDate);
      end.setDate(end.getDate() + 1);

      if (isNaN(end)) {
        return res.status(400).send("Invalid date range");
      }

      orders = await Order.find({
        createdAt: { $lte: end },
      })
        .populate({
          path: "showtime",
          populate: [
            "movie",
            {
              path: "theater",
              populate: { path: "cinema", select: "name" },
              select: "cinema number",
            },
          ],
        })
        .populate({ path: "user" });
    } else {
      orders = await Order.find()
        .populate({
          path: "showtime",
          populate: [
            "movie",
            {
              path: "theater",
              populate: { path: "cinema", select: "name" },
              select: "cinema number",
            },
          ],
        })
        .populate({ path: "user" });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = setupWorksheet(workbook);
    addOrdersToWorksheet(worksheet, orders);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=orders.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting orders:", error);
    res.status(500).send("Failed to export orders");
  }
};

exports.countOrders = async (req, res, next) => {
  try {
    const numberOfOrders = await Order.count();
    res.status(200).json({ success: true, data: {
      totalOrders: numberOfOrders
    } });
  } catch (err) {
    res.status(400).json({ success: false, message: err });
  }
};

exports.totalRevenue = async (req, res, next) => {
  try{
    const orders = await User.find({status: "done"});
    let totalRevenue = 0;
    orders.forEach(order=>totalRevenue+=order.price)
    res.status(200).json({
      success: true,
      data: {
        totalRevenue: totalRevenue,
      }
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err });
  }
}

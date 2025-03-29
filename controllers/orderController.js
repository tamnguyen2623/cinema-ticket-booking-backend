const { ProductCode, VnpLocale, dateFormat } = require("vnpay");
const User = require("../models/User");
const Order = require("../models/Order");
const { vnpay } = require("../config/vnpayConfig");
const Showtime = require("../models/Showtime");
const QRCode = require("qrcode");
const { randomUUID } = require("crypto");
const ExcelJS = require("exceljs");
const { transporter } = require("../config/mailConfig");
const Booking = require("../models/Booking");
require("dotenv");

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
    vnp_ReturnUrl: process.env.BACKEND_PREFIX + "/call-back/vnpay",
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
    console.log(order);
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
              <tr><td><strong>Giá vé:</strong></td><td>${order.price
          } VND</td></tr>
            </table>
            <p style="margin-top: 20px;">See more detail and QR code of ticket at:</p>
            <div style="text-align: center;">
              <a class="btn-primary"
                                           style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 20px; color: #FFF; text-decoration: none; line-height: 2em; font-weight: bold; text-align: center; cursor: pointer; display: inline-block; border-radius: 7px; text-transform: capitalize; background-color: #f1556c; margin: 0; border-color: #f1556c; border-style: solid; border-width: 10px 20px;
          padding: 10px 20px;"
                                           href="${process.env.FRONTEND_PREFIX +
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
                seat.row === orderSeat.row && seat.number === orderSeat.number
            )
        );
        await showtime.save();
        await Order.findByIdAndUpdate(order._id, { status: "cancelled" });
    }

    const showtime = await Showtime.findById(order.showtime._id);
    res.redirect(
      process.env.FRONTEND_PREFIX + `/showtime/${showtime._id}/${code}`
    );
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
    const numberOfOrders = await Order.count({ status: "done" });
    res.status(200).json({
      success: true,
      data: {
        totalOrders: numberOfOrders,
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err });
  }
};

exports.totalRevenue = async (req, res, next) => {
  try {
    const orders = await Order.find({ status: "done" });
    let totalRevenue = 0;
    orders.forEach((order) => (totalRevenue = totalRevenue + order.price));
    console.log(orders);
    console.log(totalRevenue);
    res.status(200).json({
      success: true,
      data: {
        totalRevenue: totalRevenue,
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err });
  }
};
exports.totalRevenueV2 = async (req, res, next) => {
  try {
    const orders = await Booking.find({ status: "success" });
    let totalRevenue = 0;
    orders.forEach((order) => (totalRevenue = totalRevenue + order.price));
    console.log(orders);
    console.log(totalRevenue);
    res.status(200).json({
      success: true,
      data: {
        totalRevenue: totalRevenue,
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err });
  }
};

exports.countOrdersByCinema = async (req, res, next) => {
  const status = "done";
  const results = await Order.aggregate([
    { $match: { status: { $eq: status } } },
    {
      $lookup: {
        from: "showtimes",
        localField: "showtime",
        foreignField: "_id",
        as: "showtimeDetails",
      },
    },
    { $unwind: "$showtimeDetails" },
    {
      $lookup: {
        from: "theaters",
        localField: "showtimeDetails.theater",
        foreignField: "_id",
        as: "theaterDetails",
      },
    },
    { $unwind: "$theaterDetails" },
    {
      $lookup: {
        from: "cinemas",
        localField: "theaterDetails.cinema",
        foreignField: "_id",
        as: "cinemaDetails",
      },
    },
    { $unwind: "$cinemaDetails" },
    {
      $group: {
        _id: "$cinemaDetails.name",
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        label: "$_id",
        value: "$count",
      },
    },
  ]);

  res.json(results);
};

exports.getTotalRevenueByCinema = async (req, res, next) => {
  const status = "success";
  const results = await Booking.aggregate([
    {
      $match: { status: "success" },
    },
    {
      $group: {
        _id: "$cinema",
        totalRevenue: { $sum: "$price" },
      },
    },
    {
      $project: {
        label: "$_id",
        value: "$totalRevenue",
      },
    },
  ]);

  res.json(results);
};

exports.getTotalRevenueByMonth = async (req, res, next) => {
  const { year } = req.query;
  const status = "success";

  if (!year) {
    return res.status(400).json({ message: "Vui lòng cung cấp năm." });
  }

  const results = await Booking.aggregate([
    {
      $match: {
        status: status,
        createdAt: {
          $gte: new Date(`${year}-01-01T00:00:00.000Z`),
          $lt: new Date(`${year}-12-31T23:59:59.999Z`),
        },
      },
    },
    {
      $group: {
        _id: { month: { $month: "$createdAt" } },
        totalRevenue: { $sum: "$price" },
      },
    },
    { $sort: { "_id.month": 1 } },
    {
      $project: {
        _id: 0,
        month: "$_id.month",
        totalRevenue: 1,
      },
    },
  ]);

  let revenueByMonth = Array(12).fill(0);

  results.forEach((item) => {
    revenueByMonth[item.month - 1] = item.totalRevenue;
  });

  res.json(revenueByMonth);
};

exports.getTotalRevenueByMonthV2 = async (req, res) => {
  try {
    const { year } = req.query;
    const revenueByMonth = await Booking.aggregate([
      {
        $match: {
          status: "success",
          paymentTime: {
            $gte: new Date(`${year}-01-01T00:00:00.000Z`),
            $lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
          },
        },
      },
      {
        $group: {
          _id: { $month: "$paymentTime" },
          totalRevenue: { $sum: "$price" },
        },
      },
      {
        $sort: { "_id": 1 },
      },
    ]);

    const result = Array.from({ length: 12 }, (_, i) => {
      const monthData = revenueByMonth.find((m) => m._id === i + 1);
      return monthData ? monthData.totalRevenue : 0;
    });

    return result;
  } catch (error) {
    console.error("Error calculating revenue by month:", error);
    return Array(12).fill(0);
  }
};


exports.getTotalRevenueByMovie = async (req, res, next) => {
  const status = "success";

  const results = await Booking.aggregate([
    {
      $match: { status: "success" },
    },
    {
      $group: {
        _id: "$movieName",
        totalRevenue: { $sum: "$price" },
      },
    },
    { $sort: { totalRevenue: -1 } },
    {
      $project: {
        _id: 0,
        movieName: "$_id",
        totalRevenue: 1,
      },
    },
  ]);

  const categories = results.map(item => item.movieName);
  const totalRevenue = results.map(item => item.totalRevenue);

  res.json({ categories, totalRevenue });
};

exports.exportTotalRevenueByCinema = async (req, res) => {
  try {
    const results = await Booking.aggregate([
      {
        $match: { status: "success" } // Chỉ lấy các booking thành công
      },
      {
        $group: {
          _id: "$cinema", // Nhóm theo tên rạp
          totalRevenue: { $sum: "$price" } // Tính tổng doanh thu
        }
      },
      {
        $lookup: {
          from: "cinemas", // Truy vấn vào collection "cinemas"
          let: { cinemaName: "$_id" }, // Lấy giá trị tên rạp từ Booking
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$name", "$$cinemaName"] }
              } // So sánh với name của Cinema
            },
            {
              $project: { name: 1, address: 1 } // Chỉ lấy trường cần thiết
            }
          ],
          as: "cinemaDetails"
        }
      },
      {
        $unwind: "$cinemaDetails" // Giải nén dữ liệu từ cinemaDetails
      },
      {
        $project: {
          cinema: "$cinemaDetails.name", // Lấy tên rạp
          address: "$cinemaDetails.address", // Lấy địa chỉ
          totalRevenue: 1 // Giữ nguyên tổng doanh thu
        }
      }
    ]);

    // Tạo file Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Total Revenue by Cinema");

    // Định nghĩa cột
    worksheet.columns = [
      { header: "Cinema", key: "cinema", width: 30 },
      { header: "Address", key: "address", width: 40 },
      { header: "Total Revenue", key: "totalRevenue", width: 20 },
    ];

    // Thêm dữ liệu vào file Excel
    results.forEach((data) => {
      worksheet.addRow(data);
    });

    // Thiết lập headers để tải file Excel về
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=total_revenue_by_cinema.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting total revenue:", error);
    res.status(500).send("Failed to export total revenue");
  }
};

exports.exportTotalRevenueByMovie = async (req, res) => {
  try {
    const results = await Booking.aggregate([
      { $match: { status: "success" } },
      { $group: { _id: "$movieName", totalRevenue: { $sum: "$price" } } },
      { $sort: { totalRevenue: -1 } },
      { $project: { movieName: "$_id", totalRevenue: 1 } },
    ]);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Total Revenue by Movie");

    worksheet.columns = [
      { header: "Movie Name", key: "movieName", width: 30 },
      { header: "Total Revenue", key: "totalRevenue", width: 20 },
    ];

    results.forEach((data) => worksheet.addRow(data));

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=total_revenue_by_movie.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting total revenue by movie:", error);
    res.status(500).send("Failed to export total revenue by movie");
  }
};

exports.exportRevenueByDay = async (req, res) => {
  try {
    const month = req.query.month || new Date().getMonth() + 1;
    const year = req.query.year || new Date().getFullYear();
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    const revenueByDay = await Booking.aggregate([
      { $match: { status: "success", paymentTime: { $gte: firstDay, $lte: lastDay } } },
      { $group: { _id: { $dayOfMonth: "$paymentTime" }, totalRevenue: { $sum: "$price" } } },
      { $sort: { _id: 1 } },
    ]);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Revenue by Day");

    worksheet.columns = [
      { header: "Day", key: "day", width: 10 },
      { header: "Total Revenue", key: "totalRevenue", width: 20 },
    ];

    revenueByDay.forEach((data) => worksheet.addRow({ day: data._id, totalRevenue: data.totalRevenue }));

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=revenue_by_day.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting revenue by day:", error);
    res.status(500).send("Failed to export revenue by day");
  }
};
exports.exportTotalRevenueByMonth = async (req, res) => {
  try {
    let { year } = req.query;
    if (!year) {
      const currentYear = new Date().getFullYear();
      year = currentYear;
    }

    const results = await Booking.aggregate([
      { $match: { status: "success", createdAt: { $gte: new Date(`${year}-01-01T00:00:00.000Z`), $lt: new Date(`${year}-12-31T23:59:59.999Z`) } } },
      { $group: { _id: { month: { $month: "$createdAt" } }, totalRevenue: { $sum: "$price" } } },
      { $sort: { "_id.month": 1 } },
      { $project: { month: "$_id.month", totalRevenue: 1 } },
    ]);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Total Revenue by Month");

    worksheet.columns = [
      { header: "Month", key: "month", width: 15 },
      { header: "Total Revenue", key: "totalRevenue", width: 20 },
    ];

    results.forEach((data) => worksheet.addRow(data));

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=total_revenue_by_month.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting total revenue by month:", error);
    res.status(500).send("Failed to export total revenue by month");
  }
};

exports.exportTotalTicketsRevenueByTicket = async (req, res) => {
  try {
    const results = await Booking.aggregate([
      { $match: { status: "success" } },
      {
        $group: {
          _id: "$movieName",
          totalRevenue: { $sum: "$price" },
          totalTickets: { $sum: { $size: "$seats" } } // Đếm tổng số vé đã bán
        }
      },
      { $sort: { totalRevenue: -1 } },
      {
        $project: {
          movieName: "$_id",
          totalRevenue: 1,
          totalTickets: 1
        }
      }
    ]);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Total Tickets & Revenue by Movie");

    worksheet.columns = [
      { header: "Movie Name", key: "movieName", width: 30 },
      { header: "Total Tickets Sold", key: "totalTickets", width: 20 },
      { header: "Total Revenue", key: "totalRevenue", width: 20 },
    ];

    results.forEach((data) => worksheet.addRow(data));

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=total_tickets_revenue_by_movie.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting total tickets and revenue:", error);
    res.status(500).send("Failed to export total tickets and revenue");
  }
};

exports.exportTotalTicketsRevenue = async (req, res) => {
  try {
    const results = await Booking.aggregate([
      { $match: { status: "success" } },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userInfo"
        }
      },
      {
        $unwind: "$userInfo"
      },
      {
        $group: {
          _id: { movieName: "$movieName", cinema: "$cinema", date: "$date", showtime: "$showtime", fullname: "$userInfo.fullname", email: "$userInfo.email" },
          totalRevenue: { $sum: "$price" },
          totalTickets: { $sum: { $size: "$seats" } },
          totalTransactions: { $sum: 1 },
          seatsList: { $push: "$seats" },
        },
      },
      {
        $project: {
          movieName: "$_id.movieName",
          cinema: "$_id.cinema",
          date: "$_id.date",
          showtime: "$_id.showtime",
          fullname: "$_id.fullname",
          email: "$_id.email",
          totalRevenue: 1,
          totalTickets: 1,
          totalTransactions: 1,
          averagePrice: { $divide: ["$totalRevenue", "$totalTickets"] },
          seats: { $reduce: { input: "$seatsList", initialValue: [], in: { $concatArrays: ["$$value", "$$this"] } } },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Tickets Revenue Report");

    worksheet.columns = [
      { header: "Customer Name", key: "fullname", width: 25 },
      { header: "Customer Email", key: "email", width: 25 },
      { header: "Movie Name", key: "movieName", width: 20 },
      { header: "Cinema", key: "cinema", width: 20 },
      { header: "Date", key: "date", width: 20 },
      { header: "Showtime", key: "showtime", width: 20 },
      { header: "Total Transactions", key: "totalTransactions", width: 20 },
      { header: "Seats", key: "seats", width: 20 },
      { header: "Total Tickets Sold", key: "totalTickets", width: 20 },
      { header: "Average Price", key: "averagePrice", width: 20 },
      { header: "Total Revenue", key: "totalRevenue", width: 20 },
    ];

    results.forEach((data) => {
      worksheet.addRow({
        ...data,
        seats: data.seats.join(", "),
      });
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=tickets_revenue.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting tickets revenue:", error);
    res.status(500).send("Failed to export tickets revenue");
  }
};

const Booking = require("../models/Booking");
const Role = require("../models/Role");
const User = require("../models/User");
const ExcelJS = require("exceljs");
require("dotenv");

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

const setupWorksheet = (workbook) => {
  const worksheet = workbook.addWorksheet("Orders");
  worksheet.columns = [
    { header: "ID", key: "_id", width: 20 },
    { header: "Username", key: "username", width: 20 },
    { header: "Full Name", key: "fullname", width: 30 },
    { header: "Email", key: "email", width: 30 },
    { header: "Number of bookings", key: "numberOfBookings", width: 20 },
    { header: "Created Date", key: "createdAt", width: 20 },
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

const addCustomersToWorksheet = (worksheet, customers) => {
  customers.forEach((customer) => {
    worksheet.addRow({
      _id: customer._id,
      username: customer.username,
      fullname: customer.fullname,
      email: customer.email,
      numberOfBookings: customer.numberOfBookings,
      createdAt: formatDateToUTC7(customer.createdAt),
      status: customer.status,
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

exports.exportCustomers = async (req, res) => {
  try {
    const customerRole = await Role.findOne({ name: "user" });
    const customers = await User.find({
      roleId: customerRole._id,
    });

    const customerIds = customers.map((customer) => customer._id);

    const bookingCounts = await Booking.aggregate([
      {
        $match: { user: { $in: customerIds }, status: "success" },
      },
      {
        $group: {
          _id: "$user",
          numberOfBookings: { $sum: 1 },
        },
      },
    ]);

    const bookingMap = bookingCounts.reduce((acc, item) => {
      acc[item._id.toString()] = item.numberOfBookings;
      return acc;
    }, {});

    const result = customers.map((customer) => ({
      ...customer.toObject(),
      numberOfBookings: bookingMap[customer._id.toString()] || 0,
      status: customer.isDelete
        ? "Deleted"
        : customer.isVerified
          ? "Active"
          : "Not verified",
    }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = setupWorksheet(workbook);
    addCustomersToWorksheet(worksheet, result);

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

exports.exportNewCustomers = async (req, res) => {
  try {
    // Lấy role của khách hàng
    const customerRole = await Role.findOne({ name: "user" });
    if (!customerRole) {
      return res.status(404).send("User role not found");
    }

    // Lấy danh sách khách hàng có role "user"
    const customers = await User.find({ roleId: customerRole._id });
    const customerIds = customers.map((customer) => customer._id);

    // Lấy danh sách khách hàng đã từng đặt vé
    const bookedCustomers = await Booking.distinct("user", { user: { $in: customerIds } });

    // Lọc ra những khách hàng chưa từng đặt vé
    const newCustomers = customers.filter((customer) => !bookedCustomers.includes(customer._id.toString()));

    // Chuẩn bị dữ liệu xuất file
    const result = newCustomers.map((customer) => ({
      fullName: customer.fullname,
      email: customer.email,
      phone: customer.phone || "N/A",
      status: customer.isDelete
        ? "Deleted"
        : customer.isVerified
          ? "Active"
          : "Not verified",
    }));

    // Tạo workbook và worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("New Customers");

    worksheet.columns = [
      { header: "Full Name", key: "fullName", width: 30 },
      { header: "Email", key: "email", width: 30 },
      { header: "Phone", key: "phone", width: 20 },
      { header: "Status", key: "status", width: 15 },
    ];

    // Thêm dữ liệu vào worksheet
    result.forEach((customer) => worksheet.addRow(customer));

    // Thiết lập header cho file tải về
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=new_customers.xlsx");

    // Ghi dữ liệu vào response và gửi file
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting new customers:", error);
    res.status(500).send("Failed to export new customers");
  }
};

const Booking = require("../models/Booking");
require("dotenv");

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

  const categories = results.map((item) => item.movieName);
  const totalRevenue = results.map((item) => item.totalRevenue);

  res.json({ categories, totalRevenue });
};

exports.getRevenueByDay = async (req, res, next) => {
  try {
    const month = req.query.month || new Date().getMonth() + 1;
    const year = req.query.year || new Date().getFullYear();
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const revenueByDay = await Booking.aggregate([
      {
        $match: {
          status: "success",
          paymentTime: {
            $gte: firstDay,
            $lte: lastDay,
          },
        },
      },
      {
        $group: {
          _id: { $dayOfMonth: "$paymentTime" },
          totalRevenue: { $sum: "$price" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const daysInMonth = lastDay.getDate();

    const result = Array.from({ length: daysInMonth }, (_, i) => {
      const dayData = revenueByDay.find((d) => d._id === i + 1);
      return dayData ? dayData.totalRevenue : 0;
    });

    res.json({
      days: Array.from({ length: daysInMonth }, (_, i) => i + 1),
      totalRevenueByDay: result,
    });
  } catch (error) {
    console.error("Error calculating revenue by day:", error);
    return [];
  }
};

exports.getRevenueByNewCustomers = async (req, res, next) => {
  try {
    const result = await Booking.aggregate([
      { $match: { status: "success" } },
      {
        $group: {
          _id: "$user",
          bookingCount: { $sum: 1 },
          totalSpent: { $sum: "$price" },
        },
      },
      {
        $facet: {
          totalRevenueByNewCustomers: [
            { $match: { bookingCount: 1 } },
            { $group: { _id: null, totalRevenue: { $sum: "$totalSpent" } } },
          ],
          totalRevenue: [
            { $group: { _id: null, totalRevenue: { $sum: "$totalSpent" } } },
          ],
        },
      },
      {
        $project: {
          _id: 0,
          totalRevenueByNewCustomers: {
            $ifNull: [
              { $arrayElemAt: ["$totalRevenueByNewCustomers.totalRevenue", 0] },
              0,
            ],
          },
          totalRevenue: {
            $ifNull: [{ $arrayElemAt: ["$totalRevenue.totalRevenue", 0] }, 0],
          },
        },
      },
    ]);

    const responseData =
      result.length > 0
        ? result[0]
        : { totalRevenueByNewCustomers: 0, totalRevenue: 0 };

    res.json([
      { label: "New customer", value: responseData.totalRevenueByNewCustomers },
      { label: "Total revenue", value: responseData.totalRevenue },
    ]);
  } catch (error) {
    console.error("Error fetching revenue stats:", error);
    throw error;
  }
};

// exports.getRevenueByNewCustomers = async (req, res, next) => {
//     try {
//       const totalRevenueResult = await Booking.aggregate([
//         { $match: { status: "success" } },
//         {
//           $group: {
//             _id: "$user", // Nhóm theo user
//             totalSpent: { $sum: "$price" },
//             count: { $sum: 1 },
//           },
//         },
//         { $match: { count: 1 } },
//           $group: {
//             _id: null,
//             totalRevenueByNewCustomers: { $sum: "$totalSpent" },
//           },
//         },
//         {
//           $project: {
//             _id: 0,
//             totalRevenueByNewCustomers: 1,
//           },
//         },
//       ]);

//       const totalRevenue = await Booking.aggregate([
//         { $match: { status: "success" } },
//         {
//           $group: {
//             _id: null,
//             totalRevenue: { $sum: "$price" },
//           },
//         },
//         {
//           $project: {
//             _id: 0,
//             totalRevenue: 1,
//           },
//         },
//       ]);

//       res.json({
//         totalRevenueByNewCustomers:
//           totalRevenueResult.length > 0
//             ? totalRevenueResult[0].totalRevenueByNewCustomers
//             : 0,
//         totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].totalRevenue : 0,
//       });
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ message: "Lỗi khi tính toán doanh thu" });
//     }
//   };

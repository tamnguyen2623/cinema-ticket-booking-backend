const Promotion = require("../models/Promotion");
const nodemailer = require("nodemailer");
const multer = require("multer");
const { uploadMultipleFiles } = require("./fileController");
const { transporter } = require("../config/mailConfig");
const User = require("../models/User");
const upload = multer();

// Get all promotions (Admin)
exports.getAllPromotions = async (req, res) => {
    try {
        const promotions = await Promotion.find().sort({ createdAt: -1 });
      console.log(" API Response:", promotions); // Log dữ liệu để kiểm tra

        res.status(200).json(promotions);
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get single combo by ID
exports.getPromotion = async (req, res, next) => {
  try {
    const promotion = await Promotion.findById(req.params.id);
    if (!promotion || promotion.isDelete) {
      return res.status(404).json({
        success: false,
        message: `promotion not found with id ${req.params.id}`,
      });
    }
    res.status(200).json({ success: true, data: promotion });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};


// Get all active promotions (Home Page)

exports.getPagePromotion = async (req, res, next) => {
  try {
    const promotions = await Promotion.find({
      dateStart: { $gte: new Date() },
      dateEnd: { $gte: new Date() },
      isDelete: false
    }).sort({ createdAt: -1 });
    console.log(" API Response:", promotions); // Log dữ liệu để kiểm tra

    res.status(200).json(promotions);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// // Search and filter promotions (Admin)
// exports.searchPromotions = async (req, res) => {
//     try {
//         const { name, dateStart, dateEnd } = req.query;
//         let filter = {};
//         if (name) filter.name = new RegExp(name, "i");
//         if (dateStart && dateEnd) {
//             filter.dateStart = { $gte: new Date(dateStart) };
//             filter.dateEnd = { $lte: new Date(dateEnd) };
//         }
//         const promotions = await Promotion.find(filter);
//         res.status(200).json(promotions);
//     } catch (error) {
//         res.status(500).json({ message: "Internal server error" });
//     }
// };

// Add new promotion (Admin)
exports.addPromotion = async (req, res, next) => {
  upload.fields([{ name: "image", maxCount: 1 }])(
    req,
    res,
    async function (error) {
      if (error) {
        console.error("File upload error:", error);
        return res
          .status(500)
          .json({ success: false, message: "File upload error" });
      }

      console.log("Request files:", req.files); // Kiểm tra multer có nhận file không
      if (!req.files["image"] || req.files["image"].length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "No image file provided" });
      }

      try {
        const uploadedFiles = await uploadMultipleFiles([
          req.files["image"][0],
        ]);
        const promotionData = {
          name: req.body.name,
          category: req.body.category,
          image: uploadedFiles["image"], // Đảm bảo dùng đúng key
          description: req.body.description,
        dateStart: req.body.dateStart,
        dateEnd: req.body.dateEnd,

          isDelete: false,
        };

          const promotion = await Promotion.create(promotionData);


        // Gửi email thông báo
        await sendPromotionEmail(promotion);

        res.status(201).json({ success: true, data: promotion });
      } catch (err) {
        console.error("Error uploading files:", err);
        res.status(400).json({ success: false, message: err.message });
      }
    }
  );
};



const sendPromotionEmail = async (promotion) => {
  try {
    const users = await User.find({ isDelete: false }).select("email");

    if (!users.length) {
      console.log("Không có khách hàng nào để gửi email.");
      return;
    }

    const mailOptions = {
      from: process.env.MAIL_ACCOUNT,
      to: users.map((user) => user.email),
      subject: `🎉 Special Offer: ${promotion.name} - Don't Miss Out!`,
      html: `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 10px; font-family: Arial, sans-serif; color: #333;">
      <!-- Title -->
      <h2 style="text-align: center; color: #ff5722;"> ${promotion.name} </h2>

      <!-- Image -->
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${promotion.image}" alt="Promotion Image" style="max-width: 100%; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);" />
      </div>

      <!-- Description -->
      <p style="font-size: 16px; line-height: 1.6; text-align: justify;">
        <strong style="color: #d32f2f;">🔥 Special Deal:</strong>
        ${promotion.description.replace(/\n/g, "<br>")}
      </p>

      <!-- Validity Period -->
      <p style="text-align: center; font-size: 14px; color: #555;">
         <b>Valid from:</b> 
        ${promotion.dateStart ? promotion.dateStart.toLocaleDateString() : "Not specified"} - 
        ${promotion.dateEnd ? promotion.dateEnd.toLocaleDateString() : "Not specified"}
      </p>

  

     
      <p style="text-align: center; margin-top: 20px; font-size: 14px; color: #777;">
        💡 Don't miss this opportunity! Take advantage of this special offer today.
      </p>
    </div>
  `,
    };

    await transporter.sendMail(mailOptions);
    console.log(" Email thông báo khuyến mãi đã gửi thành công!");
  } catch (error) {
    console.error(" Lỗi gửi email:", error);
  }
};


// Update promotion (Admin)
exports.updatePromotion = async (req, res, next) => {
  upload.fields([{ name: "image", maxCount: 1 }])(
    req,
    res,
    async function (error) {
      if (error) {
        return res
          .status(500)
          .json({ success: false, message: "File upload error" });
      }

      try {
        const promotion = await Promotion.findById(req.params.id);
        if (!promotion || promotion.isDelete) {
          return res.status(404).json({
            success: false,
            message: `promotion not found with id ${req.params.id}`,
          });
        }

        if (req.files["image"] && req.files["image"].length > 0) {
          const uploadedFiles = await uploadMultipleFiles([
            req.files["image"][0],
          ]);
          promotion.image = uploadedFiles["image"];
        }

        promotion.name = req.body.name || promotion.name;
        promotion.description = req.body.description || promotion.description;
        promotion.category = req.body.category || promotion.category;
        promotion.dateStart = req.body.dateStart || promotion.dateStart;
        promotion.dateEnd = req.body.dateEnd || promotion.dateEnd;

        await promotion.save();
        res.status(200).json({ success: true, data: promotion });
      } catch (err) {
        res.status(400).json({ success: false, message: err.message });
      }
    }
  );
};

// Delete promotion (Admin - Soft Delete)
exports.deletePromotion = async (req, res) => {
    try {
        const { id } = req.params;
        await Promotion.findByIdAndUpdate(id, req.body);
        res.status(200).json({ message: "Promotion deleted successfully" });
    } catch (error) {
        res.status(400).json({ message: "Error deleting promotion" });
    }
};



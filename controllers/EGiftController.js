const { transporter } = require("../config/mailConfig");
const EGift = require("../models/EGiftCard");
const multer = require("multer");
const { uploadMultipleFiles } = require("./fileController");
const OwningCard = require("../models/OwningCard");
const User = require("../models/User");

const upload = multer();

// Lấy danh sách tất cả eGift
exports.getAllEGifts = async (req, res) => {
  try {
    const egifts = await EGift.find();
    res.status(200).json({ success: true, data: egifts });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Lấy danh sách eGift chưa bị xóa (isDelete: false)
exports.getActiveEGifts = async (req, res) => {
  try {
    const egifts = await EGift.find({ isDelete: false });
    res.status(200).json({ success: true, data: egifts });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Lấy một eGift theo ID
exports.getEGiftById = async (req, res) => {
  try {
    const egift = await EGift.findById(req.params.id);
    if (!egift || egift.isDelete) {
      return res
        .status(404)
        .json({ success: false, message: "EGift not found" });
    }
    res.status(200).json({ success: true, data: egift });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Tạo một eGift mới
exports.createEGift = async (req, res) => {
  upload.fields([{ name: "image", maxCount: 1 }])(
    req,
    res,
    async function (error) {
      if (error) {
        return res
          .status(500)
          .json({ success: false, message: "File upload error" });
      }

      if (!req.files["image"] || req.files["image"].length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "No image file provided" });
      }

      try {
        const uploadedFiles = await uploadMultipleFiles([
          req.files["image"][0],
        ]);
        const egiftData = {
          name: req.body.name,
          image: uploadedFiles["image"],
          description: req.body.description,
          isDelete: false,
        };
        const egift = await EGift.create(egiftData);
        res.status(201).json({ success: true, data: egift });
      } catch (error) {
        res.status(400).json({ success: false, message: error.message });
      }
    }
  );
};

// Cập nhật eGift
exports.updateEGift = async (req, res) => {
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
        const egift = await EGift.findById(req.params.id);
        if (!egift || egift.isDelete) {
          return res
            .status(404)
            .json({ success: false, message: "EGift not found" });
        }

        if (req.files["image"] && req.files["image"].length > 0) {
          const uploadedFiles = await uploadMultipleFiles([
            req.files["image"][0],
          ]);
          egift.image = uploadedFiles["image"];
        }

        egift.name = req.body.name || egift.name;
        egift.description = req.body.description || egift.description;

        await egift.save();
        res.status(200).json({ success: true, data: egift });
      } catch (error) {
        res.status(400).json({ success: false, message: error.message });
      }
    }
  );
};

exports.updateIsDelete = async (req, res, next) => {
  EGift.updateOne({ _id: req.params.id }, req.body)
    .then(() => res.status(200).json({ _id: req.params.id, data: req.body }))
    .catch((error) => res.status(500).json({ message: error.message }));
};
// Xóa mềm eGift (đánh dấu isDelete là true)
exports.softDeleteEGift = async (req, res) => {
  try {
    const egift = await EGift.findById(req.params.id);
    if (!egift || egift.isDelete) {
      return res
        .status(404)
        .json({ success: false, message: "EGift not found" });
    }

    egift.isDelete = true;
    await egift.save();
    res.status(200).json({ success: true, message: "EGift marked as deleted" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.sendEGiftToUser = async (req, res) => {
  try {
    const egiftId = req.params.id;
    const { email, fullName, message, balance } = req.body;
    if (!email || !fullName || !message || !balance) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }
    const egift = await EGift.findById(egiftId);
    if (!egift || egift.isDelete) {
      return res
        .status(404)
        .json({ success: false, message: "EGift not found" });
    }
    const user = await User.findById(req.user._id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const cardNumber = Math.floor(
      100000000 + Math.random() * 900000000
    ).toString();
    const pin = Math.floor(1000 + Math.random() * 9000).toString();

    const owningCard = await OwningCard.create({
      user: user._id,
      egift: egift._id,
      cardNumber: cardNumber,
      expiryDate: new Date(
        new Date().setFullYear(new Date().getFullYear() + 1)
      ),
      balance: balance,
      pin: pin,
    });

    const mailOptions = {
      from: process.env.MAIL_ACCOUNT,
      to: email,
      subject: `🎁 ${user.fullname} has sent you a special E-Gift Card!`,
      html: `
      <div style="background: linear-gradient(to right, #ece9e6, #ffffff); padding: 30px; text-align: center; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; background-color: #ffffff; border-radius: 12px; padding: 25px; margin: auto; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
          
          <h2 style="color: #333;">🎉 Hello, <span style="color: #007bff;">${fullName}</span>!</h2>
          <p style="color: #666; font-size: 16px;">You have received a special E-Gift Card from <strong>${user.fullname}</strong>! 🎁</p>
  
          <div style="background: #f8f9fa; border-left: 5px solid #007bff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #555; font-style: italic;">"${message}"</p>
          </div>
  
          <div style="background: #ffffff; border-radius: 10px; padding: 20px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); text-align: left;">
            <h3 style="color: #333; text-align: center;">🎁 Your Gift Card Details</h3>
            <p style="color: #555;"><strong>💳 Card Number:</strong> ${cardNumber}</p>
            <p style="color: #555;"><strong>💰 Balance:</strong> $${balance}</p>
            <p style="color: #555;"><strong>🔑 PIN:</strong> ${pin}</p>
          </div>
 
          <img src="${egift.image}" alt="EGift Card" style="max-width: 100%; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
        </div>
      </div>
    `,
    };
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, data: owningCard });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

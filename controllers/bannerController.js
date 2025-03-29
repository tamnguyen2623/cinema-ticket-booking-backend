const Banner = require("../models/Banner");
const multer = require("multer");
const { uploadMultipleFiles } = require("./fileController");

const upload = multer();
// Get all combos
exports.getCombos = async (req, res, next) => {
  try {
    const combos = await Combo.find();
    res.status(200).json({ success: true, data: combos });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

class bannerController {
  // List of banners
  async getAll(req, res, next) {
    try {
      const banners = await Banner.find().sort({ createdAt: -1 });
      res.status(200).json(banners);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // List of available banners by a movie
  async getAvailableBanners(req, res, next) {
    try {
      const banners = await Banner.find({
        isDelete: false,
      });
      res.status(200).json(banners);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // List of banners by filter
  filterBanner(req, res, next) {
    Banner.find({ name: { $regex: req.params.search, $options: "i" } })
      .then((banners) => res.status(200).json(banners))
      .catch((error) => res.status(500).json({ message: error.message }));
  }

  // Create banner
  async create(req, res, next) {
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
          const bannerData = {
            name: req.body.name,
            image: uploadedFiles["image"], // Đảm bảo dùng đúng key
            isDelete: false,
          };

          const banner = await Banner.create(bannerData);
          res.status(201).json({ success: true, data: banner });
        } catch (err) {
          console.error("Error uploading files:", err);
          res.status(400).json({ success: false, message: err.message });
        }
      }
    );
  }

  // Update banner
  async update(req, res, next) {
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
          const banner = await Banner.findById(req.params.id);
          if (!banner || banner.isDelete) {
            return res.status(404).json({
              success: false,
              message: `Banner not found with id ${req.params.id}`,
            });
          }

          if (req.files["image"] && req.files["image"].length > 0) {
            const uploadedFiles = await uploadMultipleFiles([
              req.files["image"][0],
            ]);
            banner.image = uploadedFiles["image"];
          }

          banner.name = req.body.name || banner.name;

          await banner.save();
          res.status(200).json({ success: true, data: banner });
        } catch (err) {
          res.status(400).json({ success: false, message: err.message });
        }
      }
    );
  }

  // Update isDelete banner
  updateIsDelete(req, res, next) {
    Banner.updateOne({ _id: req.params.id }, req.body)
      .then(() => res.status(200).json({ _id: req.params.id, data: req.body }))
      .catch((error) => res.status(500).json({ message: error.message }));
  }
}

module.exports = new bannerController();

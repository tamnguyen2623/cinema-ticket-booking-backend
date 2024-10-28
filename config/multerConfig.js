const multer = require("multer");
const multerS3 = require("multer-s3");
const s3 = require("./awsConfig");
require("dotenv").config();

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      const fileName = Date.now().toString() + "-" + file.originalname;
      cb(null, fileName);
    },
  }),
  limits: {
    fileSize: 1024 * 1024 * 100, // Max file size of 100MB
  },
});

module.exports = upload;

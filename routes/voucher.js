const express = require("express");
const { 
  addVoucher, 
  filterVouchers, 
  updateVoucher, 
  deleteVoucher,
  getAllVouchers
} = require("../controllers/voucherController.js");

const router = express.Router();


router.post("/add", addVoucher);
router.get("/filter", filterVouchers);
router.put("/update/:id", updateVoucher);
router.delete("/delete/:id", deleteVoucher);
router.get("/list",   getAllVouchers
);

module.exports = router; 

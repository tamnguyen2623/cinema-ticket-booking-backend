const express = require("express");
const {
  addVoucher,
  filterVouchers,
  updateVoucher,
  deleteVoucher,
  getAllVouchers,
  getAllVouchersForCustomer,
} = require("../controllers/voucherController.js");

const router = express.Router();
const { protect, authorize } = require("../middleware/auth");

router.post("/add", protect, authorize("admin"), addVoucher);
router.get("/filter", filterVouchers);
router.put("/update/:id", updateVoucher);
router.put("/delete/:id", deleteVoucher);
router.get("/list", getAllVouchers);

module.exports = router;

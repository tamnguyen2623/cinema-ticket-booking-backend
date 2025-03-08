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
router.put("/update/:id", protect, authorize("admin"), updateVoucher);
router.put("/delete/:id", protect, authorize("admin"), deleteVoucher);
router.get("/list", protect, authorize("admin"), getAllVouchers);
router.get("/list", getAllVouchersForCustomer);

module.exports = router;

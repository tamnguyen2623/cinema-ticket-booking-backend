const express = require("express");
const router = express.Router();
const supportController = require("../controllers/supportController");
const { protect, authorize } = require("../middleware/auth");
router.get("/support", supportController.getAllSupports);
router.get("/support/customer", supportController.getQuestionsForCustomer);
router.get("/support/:id", supportController.getSupportById);
router.post(
  "/support",
  protect,
  authorize("admin"),
  supportController.createSupport
);
router.put(
  "/support/:id",
  protect,
  authorize("admin"),
  supportController.updateSupport
);
router.delete(
  "/support/:id",
  protect,
  authorize("admin"),
  supportController.deleteSupport
);
router.patch(
  "/support/:id/toggle-delete",
  protect,
  authorize("admin"),
  supportController.toggleIsDelete
);

module.exports = router;

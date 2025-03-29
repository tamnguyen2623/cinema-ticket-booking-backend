const { getAllPromotions, addPromotion, deletePromotion, updatePromotion, getPromotion, getActivePromotions, getHomePromotions, getPagePromotion } = require("../controllers/promotionController");
const { authorize, protect } = require("../middleware/auth");
const express = require("express");

const router = express.Router();

// Admin Routes
router.get("/admin", protect, authorize("admin"), getAllPromotions);
router.post("/admin/add", protect, authorize("admin") ,addPromotion);
router.put("/admin/update/:id",protect, authorize("admin"), updatePromotion);
router.put("/admin/delete/:id", protect, authorize("admin"), deletePromotion);

// Home Page Routes
router.get("/", protect, getPagePromotion);
router.get("/:id", protect, getPromotion);

module.exports = router;

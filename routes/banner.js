const express = require("express");
const router = express.Router();
const bannerController = require("../controllers/bannerController");
const { protect, authorize } = require("../middleware/auth");

router.get("/", bannerController.getAll);
router.get(
  "/getAvailableBanner",
  bannerController.getAvailableBanners
);
router.get("/filter/:search", bannerController.filterBanner);
router.post("/", bannerController.create);
router.put("/:id", bannerController.update);
router.put("/updateIsDelete/:id", bannerController.updateIsDelete);

module.exports = router;
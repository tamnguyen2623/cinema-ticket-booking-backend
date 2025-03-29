const express = require("express");
const router = express.Router();
const {
    getServices,
    getService,
    createService
} = require("../controllers/serviceController");
const { protect, authorize } = require("../middleware/auth");

router.get("/", getServices);
router.get("/:id", getService);
router.post(
    "/",
    createService
);

module.exports = router;

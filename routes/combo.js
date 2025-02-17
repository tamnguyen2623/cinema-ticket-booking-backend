const express = require("express");
const router = express.Router();
const {
    getCombos,
    getCombo,
    searchComboByName,
    createCombo,
    updateCombo,
    deleteCombo,
} = require("../controllers/comboController");
const { protect, authorize } = require("../middleware/auth");

router.get("/", getCombos);
router.get("/combo/:id", getCombo);
router.post(
    "/",
    protect,
    authorize("admin"),
    createCombo
);
router.put(
    "/:id",
    protect,
    authorize("admin"),
    updateCombo
);
router.delete(
    "/:id",
    protect,
    authorize("admin"),
    deleteCombo
);

module.exports = router;

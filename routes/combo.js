const express = require("express");
const router = express.Router();
const {
    getCombos,
    getCombo,
    searchComboByName,
    createCombo,
    updateCombo,
    updateIsDelete,
    deleteCombo,
    getCombosIsNotDisabled
} = require("../controllers/comboController");
const { protect, authorize } = require("../middleware/auth");

router.get("/", getCombos);
router.get("/isNotDisabled", getCombosIsNotDisabled);
router.get("/combo/:id", getCombo);
router.get("/combo/search/:name", searchComboByName);
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

router.put(
    "/updateIsDelete/:id",
    protect,
    authorize("admin"),
    updateIsDelete
);
router.delete(
    "/:id",
    protect,
    authorize("admin"),
    deleteCombo
);

module.exports = router;

const express = require("express");
const router = express.Router();
const {
    getMovieTypes,
    getMovieType,
    createMovieType,
    updateMovieType,
    deleteMovieType,
    updateIsDelete,
} = require("../controllers/movietypeController");
const { protect, authorize } = require("../middleware/auth");

router.get("/", getMovieTypes);
router.get("/movietype/:id", getMovieType);
router.post(
    "/",
    protect,
    authorize("admin"),
    createMovieType
);
router.put(
    "/:id",
    protect,
    authorize("admin"),
    updateMovieType
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
    deleteMovieType
);

module.exports = router;

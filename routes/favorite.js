const express = require("express");
const {
  toggleFavoriteMovie,
  getListFavoriteMovie,
  removeFavoriteMovie,
} = require("../controllers/favoriteMovie");

const router = express.Router();

router.post("/:movieId", toggleFavoriteMovie);
router.get("/:userId", getListFavoriteMovie)

module.exports = router;

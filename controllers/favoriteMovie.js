const User = require("../models/User");


const toggleFavoriteMovie = async (req, res) => {
  try {
    const { userId } = req.body; 
    const { movieId } = req.params;
    if (!userId || !movieId) {
      return res.status(400).json({ message: "Thiếu userId hoặc movieId" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User không tồn tại" });

    const isFavorite = user.favoriteMovies.includes(movieId);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      isFavorite
        ? { $pull: { favoriteMovies: movieId } }
        : { $addToSet: { favoriteMovies: movieId } }, 
      { new: true }
    );

    res.json({ favoriteMovies: updatedUser.favoriteMovies });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
};


const getListFavoriteMovie = async (req, res) => {
  try {
    const { userId } = req.params; 
    if (!userId) {
      return res.status(400).json({ message: "Thiếu userId" });
    }
    const user = await User.findById(userId).populate("favoriteMovies").sort({ createdAt: -1 });
    if (!user) {
      return res.status(404).json({ message: "User không tồn tại" });
    }

    res.status(200).json({ favoriteMovies: user.favoriteMovies });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
};


module.exports = { 
  toggleFavoriteMovie,  
  getListFavoriteMovie,
  };


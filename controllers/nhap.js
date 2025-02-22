const MovieShowing = require("../models/MovieShowing");

exports.getAllMovieShowing = async (req, res) => {
  try {
    const movieShowings = await MovieShowing.find()
      .populate("movieId")
      .populate({
        path: "roomId",
        populate: {
          path: "cinema",
          select: "name address",
        },
      })
      .populate("showtimeId");

    res.status(200).json({
      success: true,
      count: movieShowings.length,
      data: movieShowings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách Movie Showings!",
      error: error.message,
    });
  }
};

exports.getAllMovieShowings = async (req, res) => {
  try {
    const { movieId } = req.params;

    // Lấy danh sách suất chiếu của phim theo movieId
    const movieShowings = await MovieShowing.find({ movieId })
      .populate("movieId")
      .populate({
        path: "roomId",
        populate: {
          path: "cinema",
          select: "name address",
        },
      })
      .populate("showtimeId");

    if (!movieShowings.length) {
      return res.status(404).json({
        success: false,
        message: "Không có suất chiếu cho phim này!",
      });
    }

    // Tạo danh sách rạp duy nhất
    const cinemaMap = new Map();
    const showtimeData = [];

    movieShowings.forEach((showing) => {
      const cinema = showing.roomId?.cinema;
      if (!cinema) return;

      const cinemaKey = `${cinema.name}-${cinema.address}`;

      if (!cinemaMap.has(cinemaKey)) {
        cinemaMap.set(cinemaKey, {
          movieName: showing.movieId?.name || "N/A",
          cinemaName: cinema.name,
          address: cinema.address,
          roomName: showing.roomId?.roomtype || "N/A",
          showDates: new Set(),
          showTimes: new Set(),
        });
      }

      const cinemaData = cinemaMap.get(cinemaKey);

      // Lưu ngày chiếu và giờ chiếu vào Set để tránh trùng lặp
      if (Array.isArray(showing.showDate)) {
        showing.showDate.forEach((date) => {
          if (!isNaN(new Date(date).getTime())) {
            cinemaData.showDates.add(date);
          }
        });
      }

      if (Array.isArray(showing.showtimeId?.showtime)) {
        showing.showtimeId.showtime.forEach((time) => {
          const validShowTime = new Date(time);
          if (!isNaN(validShowTime.getTime())) {
            const formattedTime = validShowTime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            cinemaData.showTimes.add(formattedTime);
          }
        });
      }
    });

    // Chuyển đổi Set thành Array và sắp xếp ngày chiếu
    cinemaMap.forEach((cinema) => {
      showtimeData.push({
        ...cinema,
        showDates: Array.from(cinema.showDates).sort(
          (a, b) => new Date(a) - new Date(b)
        ),
        showTimes: Array.from(cinema.showTimes),
      });
    });

    res.status(200).json({
      success: true,
      cinemas: showtimeData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách suất chiếu!",
      error: error.message,
    });
  }
};

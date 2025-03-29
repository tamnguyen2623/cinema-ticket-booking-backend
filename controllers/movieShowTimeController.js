const MovieShowTime = require("../models/MovieShowTime");
const Movie = require("../models/Movie");
const Showtime = require("../models/Showtime");
const Cinema = require("../models/Cinema");

exports.addMovieShowTime = async (req, res) => {
  try {
    const { movieId, showtimeId, roomId, cinemaId, date } = req.body;

    if (!movieId || !showtimeId || !roomId || !cinemaId || !date) {
      return res.status(400).json({
        success: false,
        message:
          "Thiếu thông tin movieId, showtimeId, roomId, cinemaId hoặc date",
      });
    }

    // Kiểm tra phim có tồn tại không
    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phim",
      });
    }

    // Kiểm tra xem phim đã phát hành chưa
    const today = new Date();
    const releaseDate = new Date(movie.releaseDate);

    if (releaseDate > today) {
      return res.status(400).json({
        success: false,
        message: "Phim chưa phát hành, không thể thêm suất chiếu",
      });
    }
    console.log("releaseDate: ", releaseDate);

    const newShowTime = await MovieShowTime.create({
      movieId,
      showtimeId,
      roomId,
      cinemaId,
      date: new Date(date),
    });

    res.status(201).json({ success: true, data: newShowTime });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi thêm thời gian chiếu, vui lòng thử lại.",
    });
  }
};

exports.deleteMovieShowTime = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedShowTime = await MovieShowTime.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );

    if (!deletedShowTime) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thời gian chiếu với ID này.",
      });
    }

    res.status(200).json({
      success: true,
      message: `Đã đánh dấu xóa thời gian chiếu với ID: ${id}`,
      data: deletedShowTime,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa thời gian chiếu, vui lòng thử lại.",
      details: error.message,
    });
  }
};

exports.filterMovieShowTimes = async (req, res) => {
  try {
    const showTimes = await MovieShowTime.find()
      .populate("movieId")
      .populate("showtimeId")
      .populate("cinemaId")
      .populate("roomId")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: showTimes });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách thời gian chiếu, vui lòng thử lại.",
    });
  }
};

exports.getMovieShowTimeById = async (req, res) => {
  try {
    const { id } = req.params;
    const showTime = await MovieShowTime.findById(id)
      .populate("movieId")
      .populate("showtimeId")
      .populate("cinemaId")
      .populate("roomId").sort({ createdAt: -1 });

    if (!showTime) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thời gian chiếu với ID này.",
      });
    }

    res.status(200).json({ success: true, data: showTime });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thời gian chiếu, vui lòng thử lại.",
    });
  }
};

exports.updateMovieShowTime = async (req, res) => {
  try {
    const { id } = req.params;
    const { movieId, showtimeId, roomId, cinemaId, date } = req.body;
    const updatedShowTime = await MovieShowTime.findByIdAndUpdate(
      id,
      { movieId, showtimeId, roomId, cinemaId, date: new Date(date) },
      { new: true }
    )
      .populate("movieId")
      .populate("showtimeId")
      .populate("cinemaId")
      .populate("roomId");

    if (!updatedShowTime) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thời gian chiếu với ID này.",
      });
    }

    res.status(200).json({ success: true, data: updatedShowTime });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật thời gian chiếu, vui lòng thử lại.",
    });
  }
};

exports.getShowTimesBySelection = async (req, res) => {
  try {
    const { date, cinemaId, movieId } = req.query;

    if (!date || !cinemaId) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn đầy đủ ngày và rạp để xem suất chiếu.",
      });
    }

    const dateStart = new Date(date);
    const dateEnd = new Date(dateStart);
    dateEnd.setHours(23, 59, 59, 999);

    const filter = {
      date: { $gte: dateStart, $lte: dateEnd },
      cinemaId,
    };

    if (movieId) {
      filter.movieId = movieId; // Nếu có movieId thì lọc theo phim
    }

    const showTimes = await MovieShowTime.find(filter)
      .populate("movieId")
      .populate("showtimeId")
      .populate("cinemaId")
      .populate("roomId").sort({ createdAt: -1 });

    if (!showTimes.length) {
      return res.status(404).json({
        success: false,
        message: "Không có suất chiếu nào.",
      });
    }

    // Định dạng kết quả trả về
    const formattedShowtimes = showTimes.map((show) => ({
      _id: show._id,
      cinema: {
        _id: show.cinemaId._id,
        name: show.cinemaId.name,
      },
      movie: {
        _id: show.movieId._id,
        name: show.movieId.name,
      },
      showtime: {
        _id: show.showtimeId._id,
        showtime: show.showtimeId.startTime,
      },
      room: {
        _id: show.roomId._id,
        roomname: show.roomId.roomname,
        roomtype: show.roomId.roomtype,
      },
    }));

    res.status(200).json({
      success: true,
      data: formattedShowtimes,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy suất chiếu.",
    });
  }
};

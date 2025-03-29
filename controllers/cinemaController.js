const Cinema = require("../models/Cinema");

//@desc     GET all cinemas
//@route    GET /cinema
//@access   Public
exports.getListCinemas = async (req, res) => {
  try {
    const cinemas = await Cinema.find()
      .collation({ locale: "en", strength: 2 })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: cinemas.length, data: cinemas });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

//@desc     GET all active cinemas (not deleted)
//@route    GET /cinema/active
//@access   Public
exports.getListCinemasForCustomer = async (req, res) => {
  try {
    const cinemas = await Cinema.find({ isDelete: false })
      .collation({ locale: "en", strength: 2 })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: cinemas.length, data: cinemas });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

//@desc     GET single cinema
//@route    GET /cinema/:id
//@access   Public
exports.getCinema = async (req, res) => {
  try {
    const cinema = await Cinema.findById(req.params.id);

    if (!cinema) {
      return res.status(404).json({
        success: false,
        message: `Cinema not found with id ${req.params.id}`,
      });
    }

    res.status(200).json({ success: true, data: cinema });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

//@desc     Create a new cinema
//@route    POST /cinema
//@access   Private
exports.createCinema = async (req, res) => {
  try {
    const cinema = await Cinema.create(req.body);
    res.status(201).json({ success: true, data: cinema });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

//@desc     Update cinema
//@route    PUT /cinema/:id
//@access   Private Admin
exports.updateCinema = async (req, res) => {
  try {
    const cinema = await Cinema.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!cinema) {
      return res.status(404).json({
        success: false,
        message: `Cinema not found with id ${req.params.id}`,
      });
    }

    res.status(200).json({ success: true, data: cinema });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

//@desc     Soft delete (toggle isDelete status) a cinema
//@route    DELETE /cinema/:id
//@access   Private Admin
exports.deleteCinema = async (req, res) => {
  try {
    const { id } = req.params;
    const cinema = await Cinema.findById(id);

    if (!cinema) {
      return res.status(404).json({ success: false, message: "Cinema not found" });
    }

    cinema.isDelete = !cinema.isDelete;
    await cinema.save();

    res.status(200).json({ success: true, message: "Cinema status updated", data: cinema });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

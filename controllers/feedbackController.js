const Feedback = require("../models/Feedback");

class feedbackController {
  // List of feedbacks
  async getAll(req, res, next) {
    try {
      const feedbacks = await Feedback.find()
        .populate("userId")
        .populate("movieId")
        .sort({ createdAt: -1 });
      res.status(200).json(feedbacks);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // List of available feedbacks by a movie
  async getAvailableFeedbacks(req, res, next) {
    try {
      const feedbacks = await Feedback.find({
        movieId: req.params.movieId,
        isDelete: false,
      }).populate("userId").sort({ createdAt: -1 });
      res.status(200).json(feedbacks);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // Get feedback by user & movie
  async getFeedback(req, res, next) {
    try {
      const feedback = await Feedback.findOne({
        bookingId: req.params.bookingId,
      });
      res.status(200).json(feedback);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // List of feedbacks by filter
  filterFeedback(req, res, next) {
    Feedback.find({ movieId: req.params.movieId })
      .populate("userId")
      .populate("movieId")
      .then((feedbacks) => res.status(200).json(feedbacks))
      .catch((error) => res.status(500).json({ message: error.message }));
  }

  // Create feedback
  create(req, res, next) {
    const feedback = new Feedback(req.body);
    feedback
      .save()
      .then((newFeedback) => res.status(201).json(newFeedback))
      .catch((error) => res.status(500).json({ message: error.message }));
  }

  // Update feedback
  update(req, res, next) {
    Feedback.updateOne({ _id: req.params.id }, req.body)
      .then(() => res.status(200).json({ _id: req.params.id, data: req.body }))
      .catch((error) => res.status(500).json({ message: error.message }));
  }
}

module.exports = new feedbackController();

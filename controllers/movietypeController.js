const MovieType = require('../models/MovieType');
const mongoose = require('mongoose');

// Get all movie types
exports.getMovieTypes = async (req, res, next) => {
    try {
        const movieTypes = await MovieType.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: movieTypes });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Get single movie type by ID
exports.getMovieType = async (req, res, next) => {
    try {
        const movieType = await MovieType.findById(req.params.id);
        if (!movieType || movieType.isDelete) {
            return res.status(404).json({ success: false, message: `MovieType not found with id ${req.params.id}` });
        }
        res.status(200).json({ success: true, data: movieType });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Search movie type by name
exports.searchMovieTypeByName = async (req, res, next) => {
    try {
        const movieType = await MovieType.findOne({ name: req.query.name, isDelete: false });
        if (!movieType) {
            return res.status(404).json({ success: false, message: `MovieType not found with name ${req.query.name}` });
        }
        res.status(200).json({ success: true, data: movieType });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Create new movie type
exports.createMovieType = async (req, res, next) => {
    try {
        req.body.isDelete = false; // Default to false when creating
        const movieType = await MovieType.create(req.body);
        res.status(201).json({ success: true, data: movieType });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Update movie type
exports.updateMovieType = async (req, res, next) => {
    try {
        const movieType = await MovieType.findById(req.params.id);
        if (!movieType) {
            return res.status(404).json({ success: false, message: `MovieType not found with id ${req.params.id}` });
        }

        Object.assign(movieType, req.body);
        await movieType.save();
        res.status(200).json({ success: true, data: movieType });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
exports.updateIsDelete = async (req, res, next) => {
    MovieType.updateOne({ _id: req.params.id }, req.body)
        .then(() => res.status(200).json({ _id: req.params.id, data: req.body }))
        .catch((error) => res.status(500).json({ message: error.message }));
};

// Soft delete movie type
exports.deleteMovieType = async (req, res, next) => {
    try {
        const movieType = await MovieType.findById(req.params.id);
        if (!movieType || movieType.isDelete) {
            return res.status(404).json({ success: false, message: `MovieType not found with id ${req.params.id}` });
        }

        movieType.isDelete = true;
        await movieType.save();
        res.status(200).json({ success: true, message: 'MovieType marked as deleted' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

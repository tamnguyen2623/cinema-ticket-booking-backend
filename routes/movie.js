const express = require('express')
const {
	getMovies,
	getMovie,
	createMovie,
	updateMovie,
	deleteMovie,
	getShowingMovies,
	getUnreleasedShowingMovies,
	countMovies, getUpcomingMovies, getNowShowingMovies,
	setMovieIsDeleted,
	getCustomerMovies
} = require('../controllers/movieController')
const router = express.Router()

const { protect, authorize } = require('../middleware/auth')

router.route('/').get(getMovies).post(protect, authorize('admin'), createMovie)
router.route('/showing').get(getShowingMovies)
router.route('/total').get(countMovies)
router.route('/unreleased/showing').get(protect, authorize('admin'), getUnreleasedShowingMovies)
router.route('/upcoming').get(getUpcomingMovies)
router.route('/nowcoming').get(getNowShowingMovies)
router.route('/customer').get(getCustomerMovies)
router
	.route('/:id')
	.get(getMovie)
	.put(protect, authorize('admin'), updateMovie)
	.delete(protect, authorize('admin'), setMovieIsDeleted)


	
module.exports = router

const express = require("express");
const router = express.Router();
const {
	getAllShowtimes,
	getShowtimeById,
	createShowtime,
	updateShowtimeById,
	deleteShowtimeById,
	updateIsDelete,
} = require('../controllers/showtimeController');
const { protect, authorize } = require('../middleware/auth');

router
	.route('/')
	.get(getAllShowtimes)
	.post(createShowtime);

router
	.route('/:id')
	.get(getShowtimeById)
	.put(protect, authorize('admin'), updateShowtimeById) // Sửa lại tên hàm ở đây
	.delete(protect, authorize('admin'), deleteShowtimeById);
router.put(
	"/updateIsDelete/:id",
	protect,
	authorize("admin"),
	updateIsDelete
);
module.exports = router;


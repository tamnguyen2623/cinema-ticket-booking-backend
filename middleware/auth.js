const jwt = require('jsonwebtoken');
const User = require('../models/User');
// const Role = require('../models/Role');

exports.protect = async (req, res, next) => {
	let token;

	if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
		token = req.headers.authorization.split(' ')[1];
	}

	if (!token || token === 'null') {
		return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
	}

	try {

		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		req.user = await User.findById(decoded.id).populate('roleId');

		if (!req.user || !req.user.roleId) {
			return res.status(403).json({ success: false, message: 'User does not have a valid role' });
		}

		next();
	} catch (err) {
		return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
	}
};

exports.authorize = (...roleNames) => {
	return (req, res, next) => {
		if (!req.user || !req.user.roleId) {
			return res.status(403).json({
				success: false,
				message: 'User does not have a valid role',
			});
		}

		// So sánh xem tên vai trò có nằm trong danh sách roleNames không
		if (!roleNames.includes(req.user.roleId.name)) {
			return res.status(403).json({
				success: false,
				message: `User role ${req.user.roleId.name} is not authorized to access this route`,
			});
		}

		next();
	};
};



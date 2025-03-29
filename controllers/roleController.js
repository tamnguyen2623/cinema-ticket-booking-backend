const Role = require("../models/Role");
const User = require("../models/User");

// Lấy tất cả vai trò
exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: roles });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy vai trò theo ID
exports.getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    // if (!role || role.isDelete) {
    //     return res.status(404).json({ success: false, message: "Role not found" });
    // }
    res.status(200).json({ success: true, data: role });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Tạo vai trò mới
exports.createRole = async (req, res) => {
  try {
    const { name } = req.body;
    const role = await Role.create({ name });
    res.status(201).json({ success: true, data: role });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Cập nhật vai trò
exports.updateRole = async (req, res) => {
  try {
    const { name } = req.body;
    const role = await Role.findByIdAndUpdate(
      req.params.id,
      { name, updatedAt: Date.now() },
      { new: true }
    );

    if (!role) {
      return res
        .status(404)
        .json({ success: false, message: "Role not found" });
    }

    res.status(200).json({ success: true, data: role });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Xóa vai trò (Soft Delete)
exports.deleteRole = async (req, res) => {
    try {
        const role = await Role.findById(req.params.id);
        if (!role) {
            return res.status(404).json({ success: false, message: "Role not found" });
        }
        role.isDelete = req.body.isDelete;
        await role.save(); // Lưu thay đổi vào database
        res.status(200).json({ success: true, message: "Role deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getEmployee = async (req, res) => {
  try {
    const employees = await User.find().populate("roleId", "name");
    const { username, role } = req.query;
    const query = {};
    if (username) query.username = { $regex: username, $options: "i" };
    if (role) query["roleId"] = role;

    if (!employees.length) {
      return res
        .status(404)
        .json({ success: false, message: "No employees found" });
    }

    res.status(200).json({ success: true, data: employees });
  } catch (err) {
    console.error("Error in getEmployee:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lấy Employee theo ID
exports.getEmployeeById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("roleId");
    // if (!user || user.isDelete) {
    //     return res.status(404).json({ success: false, message: "User not found" });
    // }
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Tạo Employee mới
exports.createEmployee = async (req, res) => {
  try {
    const { roleId, username, email, fullname, password } = req.body;
    const user = await User.create({ roleId, username, email, fullname,password,isVerified: true });
     ;

    // Populate để hiển thị tên role
    const populatedUser = await User.findById(user._id).populate(
      "roleId",
      { name: 1,
        roleId: 1 }, // Chỉ trả về trường name và roleId

      
    );

    res.status(201).json({ success: true, data: populatedUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Cập nhật Employee
exports.updateEmployee = async (req, res) => {
  try {
    const { fullname, email, roleId } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { fullname, email, roleId },
      { new: true }
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Xóa user (Soft Delete)
exports.deleteEmployee = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        user.isDelete = req.body.isDelete;
        await user.save(); // Cần lưu lại thay đổi
        res.status(200).json({ success: true, message: "User deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

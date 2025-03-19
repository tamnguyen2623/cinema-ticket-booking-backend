const { getRoles, createRole, createEmployee, getEmployeeById, updateEmployee, updateRole, getRoleById, deleteRole, getEmployee, deleteEmployee } = require("../controllers/roleController");
const { authorize, protect } = require("../middleware/auth");
const express = require("express");

const router = express.Router();
router.get("/", protect, authorize("admin"), getRoles);
// router.get("/", getRoles);
router.get("/:id", protect, authorize("admin"), getRoleById);
router.post("/create", protect, authorize("admin"), createRole);
router.put("/:id", protect, authorize("admin"), updateRole);
router.put('/delete/:id/', protect, authorize("admin"), deleteRole)

router.post("/createEmployee", createEmployee);
router.put("/putEmployee/:id", protect, authorize("admin") ,updateEmployee);
// router.get("/get", protect, authorize("admin"), getEmployee);
router.get("/roles/get/:id", protect, authorize("admin"), getEmployeeById);
router.get("/roles/get", protect, authorize("admin"),getEmployee);
router.put("/deleteEmployee/:id", protect, authorize("admin"), deleteEmployee);

module.exports = router;
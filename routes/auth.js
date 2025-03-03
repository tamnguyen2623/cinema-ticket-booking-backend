const express = require("express");
const {
  register,
  verifyOtpRegister,
  resendOtp,
  login,
  getMe,
  getAll,
  logout,
  deleteUser,
  getTickets,
  updateUser,
  getQROfTicket,
  googleCallback,
  countUsers,
  changePassword,
  changeUsername,
  getOtpForgetPassword,
  verifyOtp,
} = require("../controllers/authController");
const passport = require("passport");
const router = express.Router();

const { protect, authorize } = require("../middleware/auth");

router.post("/register", register);
router.post("/verifyotpregister", verifyOtpRegister);
router.post("/resendotp", resendOtp);
router.post("/login", login);
router.get("/logout", logout);
router.get("/me", protect, getMe);
router.post("/change-password", protect, changePassword);
router.post("/change-username", protect, changeUsername);
router.post("/forget-password/getOtp", getOtpForgetPassword);
router.post("/forget-password/verifyOtp", verifyOtp);
router.get("/tickets", protect, getTickets);
router.get("/tickets/qr/:id", protect, getQROfTicket);
router.put("/user/:id", protect, authorize("admin"), updateUser);
router.get("/user", protect, authorize("admin"), getAll);
router.get("/user/total", protect, authorize("admin"), countUsers);
router.delete("/user/:id", protect, authorize("admin"), deleteUser);
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  googleCallback
);

module.exports = router;

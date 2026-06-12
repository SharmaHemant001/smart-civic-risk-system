import express from "express";
import {
  register,
  login,
  refresh,
  logout,
  getMe,
  deleteUser,
  forgotPassword,
  resetPassword
} from "../controllers/authController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";
import { validateRegister, validateLogin } from "../middleware/validationMiddleware.js";

const router = express.Router();

router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", protect, getMe);
router.delete("/users/:id", protect, restrictTo("admin"), deleteUser);

export default router;

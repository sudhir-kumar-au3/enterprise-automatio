import { Router } from "express";
import { authController } from "../controllers";
import { authenticate } from "../middleware";
import { loginValidator, registerValidator } from "../middleware/validators";

const router = Router();

// Public routes
router.post("/register", registerValidator, authController.register);
router.post("/login", loginValidator, authController.login);
router.post("/refresh-token", authController.refreshToken);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.get("/verify-reset-token/:token", authController.verifyResetToken);

// Protected routes
router.post("/logout", authenticate, authController.logout);
router.get("/me", authenticate, authController.getCurrentUser);
router.put("/profile", authenticate, authController.updateProfile);
router.put("/change-password", authenticate, authController.changePassword);

export default router;

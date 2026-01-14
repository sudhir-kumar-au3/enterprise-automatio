import { Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { validationResult } from "express-validator";
import { TeamMember } from "../models";
import config from "../config";
import { AuthenticatedRequest, ApiResponse } from "../types";
import { asyncHandler, AppError } from "../middleware";
import logger from "../utils/logger";
import { securityConfig } from "../config/security.config";

// Cookie configuration for refresh token (HTTP-only for security)
const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
const getRefreshTokenCookieOptions = (isProduction: boolean) => ({
  httpOnly: true, // Prevents JavaScript access (XSS protection)
  secure: isProduction, // HTTPS only in production
  sameSite: isProduction ? ("strict" as const) : ("lax" as const), // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  path: "/", // Available for all routes
});

// Helper to set refresh token cookie
const setRefreshTokenCookie = (res: Response, refreshToken: string) => {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie(
    REFRESH_TOKEN_COOKIE_NAME,
    refreshToken,
    getRefreshTokenCookieOptions(isProduction)
  );
};

// Helper to clear refresh token cookie
const clearRefreshTokenCookie = (res: Response) => {
  const isProduction = process.env.NODE_ENV === "production";
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ("strict" as const) : ("lax" as const),
    path: "/",
  });
};

// Generate JWT tokens - updated to include organizationId
const generateTokens = (user: any) => {
  const payload = {
    userId: user._id.toString(),
    organizationId: user.organizationId || null, // Include organizationId for multi-tenancy
    email: user.email,
    role: user.role,
    accessLevel: user.accessLevel,
  };

  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions["expiresIn"],
  });

  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions["expiresIn"],
  });

  return { accessToken, refreshToken };
};

// Register new user - updated to require organizationId
export const register = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((e) => ({ field: e.type, message: e.msg })),
      } as ApiResponse);
    }

    const { name, email, password, role, accessLevel, organizationId } =
      req.body;

    // Organization ID is required for multi-tenant registration
    // Unless registering through org signup flow (handled by organizationController)
    if (!organizationId && !req.organization?.id) {
      throw new AppError("Organization context required for registration", 400);
    }

    const orgId = organizationId || req.organization?.id;

    // Check if user exists within the organization
    const existingUser = await TeamMember.findOne({
      email,
      organizationId: orgId,
    });
    if (existingUser) {
      throw new AppError("Email already registered in this organization", 409);
    }

    // Create user with organizationId
    const user = await TeamMember.create({
      organizationId: orgId,
      name,
      email,
      password,
      role: role || "developer",
      accessLevel: accessLevel || "member",
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
    });

    const tokens = generateTokens(user);

    // Set refresh token as HTTP-only cookie (more secure than sending in response body)
    setRefreshTokenCookie(res, tokens.refreshToken);

    // Update online status
    await TeamMember.findByIdAndUpdate(user._id, {
      isOnline: true,
      lastSeen: new Date(),
    });

    logger.info(`New user registered: ${email} in org: ${orgId}`);

    res.status(201).json({
      success: true,
      data: {
        user: user.toJSON(),
        accessToken: tokens.accessToken,
        // Note: refreshToken is now in HTTP-only cookie, not in response body
      },
      message: "Registration successful",
    } as ApiResponse);
  }
);

// Login user - updated to scope by organization
export const login = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((e) => ({ field: e.type, message: e.msg })),
      } as ApiResponse);
    }

    const { email, password, organizationId } = req.body;

    // Build query - optionally scope by organization
    const query: any = { email };

    // If organization context is provided (from subdomain, header, or body)
    const orgId = organizationId || req.organization?.id;
    if (orgId) {
      query.organizationId = orgId;
    }

    // Find user with password
    const user = await TeamMember.findOne(query).select("+password");
    if (!user) {
      throw new AppError("Invalid credentials", 401);
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError("Invalid credentials", 401);
    }

    const tokens = generateTokens(user);

    // Set refresh token as HTTP-only cookie (more secure than sending in response body)
    setRefreshTokenCookie(res, tokens.refreshToken);

    // Update online status
    await TeamMember.findByIdAndUpdate(user._id, {
      isOnline: true,
      lastSeen: new Date(),
    });

    logger.info(`User logged in: ${email} (org: ${user.organizationId})`);

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        accessToken: tokens.accessToken,
        // Note: refreshToken is now in HTTP-only cookie, not in response body
      },
      message: "Login successful",
    } as ApiResponse);
  }
);

// Logout user
export const logout = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (req.user) {
      await TeamMember.findByIdAndUpdate(req.user.userId, {
        isOnline: false,
        lastSeen: new Date(),
      });
      logger.info(`User logged out: ${req.user.email}`);
    }

    // Clear the refresh token cookie
    clearRefreshTokenCookie(res);

    res.json({
      success: true,
      message: "Logout successful",
    } as ApiResponse);
  }
);

// Refresh token - now reads from HTTP-only cookie
export const refreshToken = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    // Try to get refresh token from HTTP-only cookie first, then fall back to body for backwards compatibility
    const token =
      req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] || req.body.refreshToken;

    if (!token) {
      throw new AppError("Refresh token required", 400);
    }

    try {
      const decoded = jwt.verify(token, config.jwt.refreshSecret) as any;
      const user = await TeamMember.findById(decoded.userId);

      if (!user) {
        throw new AppError("User not found", 404);
      }

      const tokens = generateTokens(user);

      // Set new refresh token as HTTP-only cookie (token rotation for security)
      setRefreshTokenCookie(res, tokens.refreshToken);

      res.json({
        success: true,
        data: {
          accessToken: tokens.accessToken,
          // Note: refreshToken is now in HTTP-only cookie, not in response body
        },
        message: "Token refreshed",
      } as ApiResponse);
    } catch (error) {
      // Clear the invalid cookie
      clearRefreshTokenCookie(res);
      throw new AppError("Invalid refresh token", 401);
    }
  }
);

// Get current user
export const getCurrentUser = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const user = await TeamMember.findById(req.user?.userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    res.json({
      success: true,
      data: user.toJSON(),
    } as ApiResponse);
  }
);

// Update current user profile
export const updateProfile = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((e) => ({ field: e.type, message: e.msg })),
      } as ApiResponse);
    }

    const { name, avatarUrl } = req.body;
    const updateData: any = {};

    if (name) updateData.name = name;
    if (avatarUrl) updateData.avatarUrl = avatarUrl;

    const user = await TeamMember.findByIdAndUpdate(
      req.user?.userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new AppError("User not found", 404);
    }

    res.json({
      success: true,
      data: user.toJSON(),
      message: "Profile updated",
    } as ApiResponse);
  }
);

// Change password
export const changePassword = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError("Current and new passwords are required", 400);
    }

    if (newPassword.length < securityConfig.password.minLength) {
      throw new AppError(
        `New password must be at least ${securityConfig.password.minLength} characters`,
        400
      );
    }

    const user = await TeamMember.findById(req.user?.userId).select(
      "+password"
    );
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new AppError("Current password is incorrect", 401);
    }

    user.password = newPassword;
    await user.save();

    logger.info(`Password changed for user: ${user.email}`);

    res.json({
      success: true,
      message: "Password changed successfully",
    } as ApiResponse);
  }
);

// Forgot password - request reset token
export const forgotPassword = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { email } = req.body;

    if (!email) {
      throw new AppError("Email is required", 400);
    }

    const user = await TeamMember.findOne({ email });

    // Always return success to prevent email enumeration
    if (!user) {
      logger.info(`Password reset requested for non-existent email: ${email}`);
      return res.json({
        success: true,
        message:
          "If an account with that email exists, a password reset link has been sent.",
      } as ApiResponse);
    }

    // Generate reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // In production, send email with reset link
    // For now, we'll return the token in development
    const resetUrl = `${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }/reset-password?token=${resetToken}`;

    logger.info(`Password reset token generated for: ${email}`);

    // In production, you would send an email here
    // await sendEmail({ to: email, subject: 'Password Reset', html: `...${resetUrl}...` });

    res.json({
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent.",
      // Only include in development for testing
      ...(process.env.NODE_ENV === "development" && { resetToken, resetUrl }),
    } as ApiResponse);
  }
);

// Reset password with token
export const resetPassword = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { token, password } = req.body;

    if (!token || !password) {
      throw new AppError("Token and new password are required", 400);
    }

    if (password.length < securityConfig.password.minLength) {
      throw new AppError(
        `Password must be at least ${securityConfig.password.minLength} characters`,
        400
      );
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with valid token
    const user = await TeamMember.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select("+password +passwordResetToken +passwordResetExpires");

    if (!user) {
      throw new AppError("Invalid or expired reset token", 400);
    }

    // Update password and clear reset token
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    logger.info(`Password reset successful for: ${user.email}`);

    res.json({
      success: true,
      message:
        "Password has been reset successfully. You can now log in with your new password.",
    } as ApiResponse);
  }
);

// Verify reset token (check if token is valid before showing reset form)
export const verifyResetToken = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { token } = req.params;

    if (!token) {
      throw new AppError("Token is required", 400);
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await TeamMember.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new AppError("Invalid or expired reset token", 400);
    }

    res.json({
      success: true,
      message: "Token is valid",
    } as ApiResponse);
  }
);

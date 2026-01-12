import { Response } from "express";
import jwt from "jsonwebtoken";
import { validationResult } from "express-validator";
import { TeamMember } from "../models";
import config from "../config";
import { AuthenticatedRequest, ApiResponse } from "../types";
import { asyncHandler, AppError } from "../middleware";
import logger from "../utils/logger";

// Generate JWT tokens
const generateTokens = (user: any) => {
  const payload = {
    userId: user._id.toString(),
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

// Register new user
export const register = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((e) => ({ field: e.type, message: e.msg })),
      } as ApiResponse);
    }

    const { name, email, password, role, accessLevel } = req.body;

    // Check if user exists
    const existingUser = await TeamMember.findOne({ email });
    if (existingUser) {
      throw new AppError("Email already registered", 409);
    }

    // Create user
    const user = await TeamMember.create({
      name,
      email,
      password,
      role: role || "developer",
      accessLevel: accessLevel || "member",
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
    });

    const tokens = generateTokens(user);

    // Update online status
    await TeamMember.findByIdAndUpdate(user._id, {
      isOnline: true,
      lastSeen: new Date(),
    });

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      success: true,
      data: {
        user: user.toJSON(),
        ...tokens,
      },
      message: "Registration successful",
    } as ApiResponse);
  }
);

// Login user
export const login = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((e) => ({ field: e.type, message: e.msg })),
      } as ApiResponse);
    }

    const { email, password } = req.body;

    // Find user with password
    const user = await TeamMember.findOne({ email }).select("+password");
    if (!user) {
      throw new AppError("Invalid credentials", 401);
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError("Invalid credentials", 401);
    }

    const tokens = generateTokens(user);

    // Update online status
    await TeamMember.findByIdAndUpdate(user._id, {
      isOnline: true,
      lastSeen: new Date(),
    });

    logger.info(`User logged in: ${email}`);

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        ...tokens,
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

    res.json({
      success: true,
      message: "Logout successful",
    } as ApiResponse);
  }
);

// Refresh token
export const refreshToken = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { refreshToken: token } = req.body;

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

      res.json({
        success: true,
        data: tokens,
        message: "Token refreshed",
      } as ApiResponse);
    } catch (error) {
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

    if (newPassword.length < 6) {
      throw new AppError("New password must be at least 6 characters", 400);
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

import { Response } from "express";
import { validationResult } from "express-validator";
import { TeamMember } from "../models";
import {
  AuthenticatedRequest,
  ApiResponse,
  TeamMemberFilterQuery,
} from "../types";
import { asyncHandler, AppError } from "../middleware";
import logger from "../utils/logger";

// Get all team members
export const getTeamMembers = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const {
      page = 1,
      limit = 50,
      sortBy = "name",
      sortOrder = "asc",
      role,
      accessLevel,
      isOnline,
      search,
    } = req.query as TeamMemberFilterQuery;

    const query: any = {};

    if (role) query.role = role;
    if (accessLevel) query.accessLevel = accessLevel;
    if (isOnline !== undefined) query.isOnline = String(isOnline) === "true";

    // Text search on name and email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort: any = { [sortBy as string]: sortOrder === "asc" ? 1 : -1 };

    const [members, total] = await Promise.all([
      TeamMember.find(query).sort(sort).skip(skip).limit(Number(limit)),
      TeamMember.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: members,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    } as ApiResponse);
  }
);

// Get single team member
export const getTeamMember = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const member = await TeamMember.findById(req.params.id);

    if (!member) {
      throw new AppError("Team member not found", 404);
    }

    res.json({
      success: true,
      data: member,
    } as ApiResponse);
  }
);

// Create team member (admin only)
export const createTeamMember = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((e) => ({ field: e.type, message: e.msg })),
      } as ApiResponse);
    }

    const { name, email, password, role, accessLevel } = req.body;

    // Check if email already exists
    const existingMember = await TeamMember.findOne({ email });
    if (existingMember) {
      throw new AppError("Email already registered", 409);
    }

    const member = await TeamMember.create({
      name,
      email,
      password,
      role: role || "developer",
      accessLevel: accessLevel || "member",
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
    });

    logger.info(`Team member created: ${email} by ${req.user?.email}`);

    res.status(201).json({
      success: true,
      data: member,
      message: "Team member created successfully",
    } as ApiResponse);
  }
);

// Update team member
export const updateTeamMember = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((e) => ({ field: e.type, message: e.msg })),
      } as ApiResponse);
    }

    const member = await TeamMember.findById(req.params.id);
    if (!member) {
      throw new AppError("Team member not found", 404);
    }

    // Prevent changing owner's access level
    if (
      member.accessLevel === "owner" &&
      req.body.accessLevel &&
      req.body.accessLevel !== "owner"
    ) {
      throw new AppError("Cannot change owner access level", 403);
    }

    const updateData = { ...req.body };
    delete updateData.password; // Don't allow password update through this endpoint

    const updatedMember = await TeamMember.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    logger.info(`Team member updated: ${member.email} by ${req.user?.email}`);

    res.json({
      success: true,
      data: updatedMember,
      message: "Team member updated successfully",
    } as ApiResponse);
  }
);

// Delete team member
export const deleteTeamMember = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const member = await TeamMember.findById(req.params.id);

    if (!member) {
      throw new AppError("Team member not found", 404);
    }

    // Prevent deleting owner
    if (member.accessLevel === "owner") {
      throw new AppError("Cannot delete owner", 403);
    }

    // Prevent self-deletion
    if (member._id.toString() === req.user?.userId) {
      throw new AppError("Cannot delete yourself", 403);
    }

    await TeamMember.findByIdAndDelete(req.params.id);

    logger.info(`Team member deleted: ${member.email} by ${req.user?.email}`);

    res.json({
      success: true,
      message: "Team member deleted successfully",
    } as ApiResponse);
  }
);

// Update online status
export const updateOnlineStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { isOnline } = req.body;

    if (typeof isOnline !== "boolean") {
      throw new AppError("isOnline must be a boolean", 400);
    }

    const member = await TeamMember.findByIdAndUpdate(
      req.params.id,
      { isOnline, lastSeen: new Date() },
      { new: true }
    );

    if (!member) {
      throw new AppError("Team member not found", 404);
    }

    res.json({
      success: true,
      data: member,
      message: `Status updated to ${isOnline ? "online" : "offline"}`,
    } as ApiResponse);
  }
);

// Update member role
export const updateMemberRole = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { role } = req.body;

    if (!["architect", "developer", "devops", "product"].includes(role)) {
      throw new AppError("Invalid role", 400);
    }

    const member = await TeamMember.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    );

    if (!member) {
      throw new AppError("Team member not found", 404);
    }

    logger.info(
      `Role updated for ${member.email} to ${role} by ${req.user?.email}`
    );

    res.json({
      success: true,
      data: member,
      message: "Role updated",
    } as ApiResponse);
  }
);

// Update member access level
export const updateAccessLevel = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { accessLevel } = req.body;

    if (!["owner", "admin", "member", "viewer"].includes(accessLevel)) {
      throw new AppError("Invalid access level", 400);
    }

    const member = await TeamMember.findById(req.params.id);
    if (!member) {
      throw new AppError("Team member not found", 404);
    }

    // Prevent changing owner's access level
    if (member.accessLevel === "owner") {
      throw new AppError("Cannot change owner access level", 403);
    }

    // Only owner can set someone as owner
    if (accessLevel === "owner" && req.user?.accessLevel !== "owner") {
      throw new AppError("Only owner can transfer ownership", 403);
    }

    member.accessLevel = accessLevel;
    await member.save();

    logger.info(
      `Access level updated for ${member.email} to ${accessLevel} by ${req.user?.email}`
    );

    res.json({
      success: true,
      data: member,
      message: "Access level updated",
    } as ApiResponse);
  }
);

// Update custom permissions
export const updateCustomPermissions = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { customPermissions } = req.body;

    if (!Array.isArray(customPermissions)) {
      throw new AppError("customPermissions must be an array", 400);
    }

    const member = await TeamMember.findByIdAndUpdate(
      req.params.id,
      { customPermissions },
      { new: true, runValidators: true }
    );

    if (!member) {
      throw new AppError("Team member not found", 404);
    }

    res.json({
      success: true,
      data: member,
      message: "Custom permissions updated",
    } as ApiResponse);
  }
);

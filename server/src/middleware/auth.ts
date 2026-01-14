import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "../config";
import {
  AuthenticatedRequest,
  JwtPayload,
  ApiResponse,
  Permission,
  AccessLevel,
} from "../types";
import logger from "../utils/logger";

// Access level permissions mapping
const ACCESS_LEVEL_PERMISSIONS: Record<AccessLevel, Permission[]> = {
  owner: [
    "manage_team",
    "manage_roles",
    "manage_permissions",
    "create_tasks",
    "assign_tasks",
    "delete_tasks",
    "edit_all_tasks",
    "create_comments",
    "delete_comments",
    "manage_services",
    "manage_workflows",
    "manage_roadmap",
    "view_analytics",
    "export_data",
  ],
  admin: [
    "manage_team",
    "create_tasks",
    "assign_tasks",
    "delete_tasks",
    "edit_all_tasks",
    "create_comments",
    "delete_comments",
    "manage_services",
    "manage_workflows",
    "manage_roadmap",
    "view_analytics",
    "export_data",
  ],
  member: [
    "create_tasks",
    "assign_tasks",
    "create_comments",
    "view_analytics",
    "export_data",
  ],
  viewer: ["create_comments"],
};

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        error: "Access denied. No token provided.",
      } as ApiResponse);
      return;
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: "Token expired. Please login again.",
      } as ApiResponse);
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: "Invalid token.",
      } as ApiResponse);
      return;
    }

    logger.error("Authentication error:", error);
    res.status(500).json({
      success: false,
      error: "Authentication failed.",
    } as ApiResponse);
  }
};

// Optional authentication - doesn't fail if no token
export const optionalAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      req.user = decoded;
    }

    next();
  } catch (error) {
    // Continue without user context
    next();
  }
};

/**
 * Require specific permission to access route
 */
export const requirePermission = (permission: Permission) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      } as ApiResponse);
      return;
    }

    const userPermissions =
      ACCESS_LEVEL_PERMISSIONS[req.user.accessLevel] || [];

    if (!userPermissions.includes(permission)) {
      res.status(403).json({
        success: false,
        error: `Permission denied. Required: ${permission}`,
        code: "PERMISSION_DENIED",
      } as ApiResponse);
      return;
    }

    next();
  };
};

/**
 * Require specific access level or higher
 */
export const requireAccessLevel = (minLevel: AccessLevel) => {
  const levelHierarchy: AccessLevel[] = ["viewer", "member", "admin", "owner"];

  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      } as ApiResponse);
      return;
    }

    const userLevelIndex = levelHierarchy.indexOf(req.user.accessLevel);
    const requiredLevelIndex = levelHierarchy.indexOf(minLevel);

    if (userLevelIndex < requiredLevelIndex) {
      res.status(403).json({
        success: false,
        error: `Access denied. Required access level: ${minLevel}`,
        code: "ACCESS_LEVEL_DENIED",
      } as ApiResponse);
      return;
    }

    next();
  };
};

import { Response, NextFunction } from "express";
import {
  AuthenticatedRequest,
  Permission,
  AccessLevel,
  ApiResponse,
} from "../types";

// Permission mappings by access level
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

// Check if user has specific permission
export const hasPermission = (
  accessLevel: AccessLevel,
  permission: Permission
): boolean => {
  const permissions = ACCESS_LEVEL_PERMISSIONS[accessLevel] || [];
  return permissions.includes(permission);
};

// Middleware to check permissions
export const requirePermission = (...permissions: Permission[]) => {
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
    const hasRequiredPermission = permissions.some((p) =>
      userPermissions.includes(p)
    );

    if (!hasRequiredPermission) {
      res.status(403).json({
        success: false,
        error: "Insufficient permissions",
      } as ApiResponse);
      return;
    }

    next();
  };
};

// Middleware to check access level
export const requireAccessLevel = (...levels: AccessLevel[]) => {
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

    if (!levels.includes(req.user.accessLevel)) {
      res.status(403).json({
        success: false,
        error: "Access level not authorized for this action",
      } as ApiResponse);
      return;
    }

    next();
  };
};

export { ACCESS_LEVEL_PERMISSIONS };

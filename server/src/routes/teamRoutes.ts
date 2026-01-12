import { Router } from "express";
import { teamController } from "../controllers";
import {
  authenticate,
  requirePermission,
  requireAccessLevel,
} from "../middleware";
import {
  createTeamMemberValidator,
  updateTeamMemberValidator,
  paginationValidator,
  idValidator,
} from "../middleware/validators";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all team members
router.get("/", paginationValidator, teamController.getTeamMembers);

// Get single team member
router.get("/:id", idValidator, teamController.getTeamMember);

// Create team member (admin/owner only)
router.post(
  "/",
  requirePermission("manage_team"),
  createTeamMemberValidator,
  teamController.createTeamMember
);

// Update team member
router.put(
  "/:id",
  requirePermission("manage_team"),
  updateTeamMemberValidator,
  teamController.updateTeamMember
);

// Delete team member
router.delete(
  "/:id",
  requirePermission("manage_team"),
  idValidator,
  teamController.deleteTeamMember
);

// Update online status
router.patch("/:id/status", idValidator, teamController.updateOnlineStatus);

// Update role (admin/owner only)
router.patch(
  "/:id/role",
  requirePermission("manage_roles"),
  idValidator,
  teamController.updateMemberRole
);

// Update access level (owner only for certain operations)
router.patch(
  "/:id/access-level",
  requireAccessLevel("owner", "admin"),
  idValidator,
  teamController.updateAccessLevel
);

// Update custom permissions
router.patch(
  "/:id/permissions",
  requirePermission("manage_permissions"),
  idValidator,
  teamController.updateCustomPermissions
);

export default router;

/**
 * Organization Routes
 * Routes for organization management and settings
 */

import { Router } from "express";
import organizationController from "../controllers/organizationController";
import { authenticate, requirePermission } from "../middleware/auth";
import {
  resolveOrganization,
  requireOrganization,
} from "../middleware/organization";

const router = Router();

// Public routes (no auth required)
router.post("/signup", organizationController.createOrganization);
router.get("/check-slug/:slug", organizationController.checkSlugAvailability);
router.get("/public/:slug", organizationController.getOrganizationPublic);

// Protected routes (auth required)
router.use(authenticate);
router.use(resolveOrganization);

// Get current organization
router.get(
  "/current",
  requireOrganization,
  organizationController.getOrganization
);

// Update organization (owner/admin only)
router.patch(
  "/current",
  requireOrganization,
  requirePermission("manage_team"),
  organizationController.updateOrganization
);

// Branding settings
router.patch(
  "/current/branding",
  requireOrganization,
  requirePermission("manage_team"),
  organizationController.updateBranding
);

// Legal documents
router.patch(
  "/current/legal",
  requireOrganization,
  requirePermission("manage_team"),
  organizationController.updateLegal
);

// Usage statistics
router.get(
  "/current/usage",
  requireOrganization,
  organizationController.getUsageStats
);

export default router;

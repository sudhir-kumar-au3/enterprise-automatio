/**
 * Organization Controller
 * Handles organization management, onboarding, and settings
 */

import { Request, Response, NextFunction } from "express";
import { Organization, TeamMember, PLAN_LIMITS } from "../models";
import logger from "../utils/logger";

/**
 * Create a new organization (signup flow)
 */
export const createOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      organizationName,
      slug,
      ownerName,
      ownerEmail,
      ownerPassword,
      plan = "free",
    } = req.body;

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({
        success: false,
        error: "Slug can only contain lowercase letters, numbers, and hyphens",
      });
    }

    // Check if slug is already taken
    const existingOrg = await Organization.findOne({ slug });
    if (existingOrg) {
      return res.status(400).json({
        success: false,
        error: "This organization URL is already taken",
      });
    }

    // Check if email is already registered
    const existingUser = await TeamMember.findOne({
      email: ownerEmail.toLowerCase(),
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "Email is already registered",
      });
    }

    // Create organization first (without owner reference)
    const organization = new Organization({
      name: organizationName,
      slug,
      branding: {
        companyName: organizationName,
        primaryColor: "#3b82f6",
        accentColor: "#8b5cf6",
      },
      subscription: {
        plan,
        status: plan === "free" ? "active" : "trialing",
        trialEndsAt:
          plan !== "free"
            ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
            : undefined,
      },
      limits: PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS],
      ownerId: "temp", // Will update after creating owner
    });

    await organization.save();

    // Create the owner user
    const owner = new TeamMember({
      organizationId: organization._id.toString(),
      name: ownerName,
      email: ownerEmail.toLowerCase(),
      password: ownerPassword,
      role: "architect",
      accessLevel: "owner",
    });

    await owner.save();

    // Update organization with owner reference
    organization.ownerId = owner._id.toString();
    await organization.save();

    logger.info(`New organization created: ${organization.slug}`, {
      organizationId: organization._id,
      ownerId: owner._id,
    });

    res.status(201).json({
      success: true,
      data: {
        organization: {
          id: organization._id,
          name: organization.name,
          slug: organization.slug,
          branding: organization.branding,
        },
        owner: {
          id: owner._id,
          name: owner.name,
          email: owner.email,
        },
      },
    });
  } catch (error) {
    logger.error("Error creating organization:", error);
    next(error);
  }
};

/**
 * Get organization public info (for login page branding)
 */
export const getOrganizationPublic = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { slug } = req.params;

    const organization = await Organization.findOne({ slug, isActive: true });
    if (!organization) {
      return res.status(404).json({
        success: false,
        error: "Organization not found",
      });
    }

    // Return only public-safe information
    res.json({
      success: true,
      data: {
        name: organization.name,
        slug: organization.slug,
        branding: organization.branding,
        legal: {
          termsOfServiceUrl: organization.legal.termsOfServiceUrl,
          privacyPolicyUrl: organization.legal.privacyPolicyUrl,
        },
        support: {
          email: organization.support.email,
          websiteUrl: organization.support.websiteUrl,
        },
        settings: {
          allowPublicSignup: organization.settings.allowPublicSignup,
          ssoEnabled: organization.settings.ssoEnabled,
          ssoProvider: organization.settings.ssoProvider,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get full organization details (authenticated)
 */
export const getOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.organization) {
      return res.status(400).json({
        success: false,
        error: "Organization context required",
      });
    }

    const organization = await Organization.findById(req.organization.id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        error: "Organization not found",
      });
    }

    res.json({
      success: true,
      data: organization,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update organization settings
 */
export const updateOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.organization) {
      return res.status(400).json({
        success: false,
        error: "Organization context required",
      });
    }

    const { branding, legal, support, settings } = req.body;

    const organization = await Organization.findById(req.organization.id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        error: "Organization not found",
      });
    }

    // Update allowed fields
    if (branding) {
      // Check if custom branding is allowed
      if (!organization.limits.features.includes("custom_branding")) {
        return res.status(403).json({
          success: false,
          error: "Custom branding is not available on your current plan",
          code: "FEATURE_NOT_AVAILABLE",
        });
      }
      organization.branding = { ...organization.branding, ...branding };
    }

    if (legal) {
      organization.legal = { ...organization.legal, ...legal };
    }

    if (support) {
      organization.support = { ...organization.support, ...support };
    }

    if (settings) {
      // Validate SSO settings
      if (
        settings.ssoEnabled &&
        !organization.limits.features.includes("sso")
      ) {
        return res.status(403).json({
          success: false,
          error: "SSO is not available on your current plan",
          code: "FEATURE_NOT_AVAILABLE",
        });
      }
      organization.settings = { ...organization.settings, ...settings };
    }

    await organization.save();

    res.json({
      success: true,
      data: organization,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update organization branding
 */
export const updateBranding = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.organization) {
      return res.status(400).json({
        success: false,
        error: "Organization context required",
      });
    }

    const organization = await Organization.findById(req.organization.id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        error: "Organization not found",
      });
    }

    // Check feature availability
    if (!organization.limits.features.includes("custom_branding")) {
      return res.status(403).json({
        success: false,
        error: "Custom branding requires Professional plan or higher",
        code: "UPGRADE_REQUIRED",
      });
    }

    organization.branding = { ...organization.branding, ...req.body };
    await organization.save();

    res.json({
      success: true,
      data: { branding: organization.branding },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update legal documents (Terms, Privacy, etc.)
 */
export const updateLegal = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.organization) {
      return res.status(400).json({
        success: false,
        error: "Organization context required",
      });
    }

    const organization = await Organization.findById(req.organization.id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        error: "Organization not found",
      });
    }

    organization.legal = { ...organization.legal, ...req.body };
    await organization.save();

    res.json({
      success: true,
      data: { legal: organization.legal },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get organization usage statistics
 */
export const getUsageStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.organization) {
      return res.status(400).json({
        success: false,
        error: "Organization context required",
      });
    }

    const [userCount, taskCount] = await Promise.all([
      TeamMember.countDocuments({ organizationId: req.organization.id }),
      // Import Task model and count
      require("../models").Task.countDocuments({
        organizationId: req.organization.id,
      }),
    ]);

    const limits = req.organization.limits;

    res.json({
      success: true,
      data: {
        users: {
          current: userCount,
          limit: limits.maxUsers,
          percentage:
            limits.maxUsers > 0
              ? Math.round((userCount / limits.maxUsers) * 100)
              : 0,
        },
        tasks: {
          current: taskCount,
          limit: limits.maxTasks,
          percentage:
            limits.maxTasks > 0
              ? Math.round((taskCount / limits.maxTasks) * 100)
              : 0,
        },
        plan: req.organization.subscription.plan,
        features: limits.features,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check slug availability
 */
export const checkSlugAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { slug } = req.params;

    // Reserved slugs
    const reservedSlugs = [
      "api",
      "www",
      "admin",
      "app",
      "dashboard",
      "login",
      "signup",
      "help",
      "support",
    ];
    if (reservedSlugs.includes(slug.toLowerCase())) {
      return res.json({
        success: true,
        data: { available: false, reason: "This URL is reserved" },
      });
    }

    const existing = await Organization.findOne({ slug: slug.toLowerCase() });

    res.json({
      success: true,
      data: { available: !existing },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createOrganization,
  getOrganizationPublic,
  getOrganization,
  updateOrganization,
  updateBranding,
  updateLegal,
  getUsageStats,
  checkSlugAvailability,
};

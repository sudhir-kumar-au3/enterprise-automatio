/**
 * Organization Middleware
 * Handles multi-tenant context resolution and validation
 */

import { Request, Response, NextFunction } from "express";
import { Organization, PLAN_LIMITS } from "../models";
import logger from "../utils/logger";

// Extend Express Request to include organization context
declare global {
  namespace Express {
    interface Request {
      organization?: {
        id: string;
        slug: string;
        name: string;
        branding: any;
        legal: any;
        support: any;
        subscription: any;
        limits: any;
        settings: any;
      };
    }
  }
}

/**
 * Resolve organization from subdomain, custom domain, or header
 */
export const resolveOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let organizationSlug: string | undefined;
    let organizationId: string | undefined;

    // Priority 1: Custom domain
    const host = req.get("host") || "";
    const customDomainOrg = await Organization.findOne({
      domain: host.toLowerCase(),
      isActive: true,
    });

    if (customDomainOrg) {
      req.organization = formatOrganization(customDomainOrg);
      return next();
    }

    // Priority 2: Subdomain (e.g., acme.pulsework.io)
    const subdomain = extractSubdomain(host);
    if (subdomain && subdomain !== "www" && subdomain !== "api") {
      organizationSlug = subdomain;
    }

    // Priority 3: X-Organization-ID header (for API calls)
    if (!organizationSlug) {
      organizationId = req.get("X-Organization-ID");
    }

    // Priority 4: Organization slug in URL path (e.g., /org/acme/...)
    if (!organizationSlug && !organizationId) {
      const pathMatch = req.path.match(/^\/org\/([a-z0-9-]+)/);
      if (pathMatch) {
        organizationSlug = pathMatch[1];
      }
    }

    // Priority 5: From authenticated user's organization
    if (
      !organizationSlug &&
      !organizationId &&
      (req as any).user?.organizationId
    ) {
      organizationId = (req as any).user.organizationId;
    }

    // Lookup organization
    if (organizationSlug || organizationId) {
      const org = await Organization.findOne({
        ...(organizationSlug
          ? { slug: organizationSlug }
          : { _id: organizationId }),
        isActive: true,
      });

      if (!org) {
        return res.status(404).json({
          success: false,
          error: "Organization not found",
          code: "ORG_NOT_FOUND",
        });
      }

      // Check subscription status
      if (
        org.subscription.status === "suspended" ||
        org.subscription.status === "canceled"
      ) {
        return res.status(403).json({
          success: false,
          error: "Organization subscription is not active",
          code: "ORG_SUBSCRIPTION_INACTIVE",
        });
      }

      req.organization = formatOrganization(org);
    }

    next();
  } catch (error) {
    logger.error("Error resolving organization:", error);
    next(error);
  }
};

/**
 * Require organization context for protected routes
 */
export const requireOrganization = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.organization) {
    return res.status(400).json({
      success: false,
      error: "Organization context required",
      code: "ORG_REQUIRED",
    });
  }
  next();
};

/**
 * Check if feature is enabled for organization's plan
 */
export const requireFeature = (feature: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.organization) {
      return res.status(400).json({
        success: false,
        error: "Organization context required",
        code: "ORG_REQUIRED",
      });
    }

    const enabledFeatures = req.organization.limits.features || [];
    if (!enabledFeatures.includes(feature)) {
      return res.status(403).json({
        success: false,
        error: `Feature '${feature}' is not available on your current plan`,
        code: "FEATURE_NOT_AVAILABLE",
        requiredPlan: getMinimumPlanForFeature(feature),
      });
    }

    next();
  };
};

/**
 * Check organization limits (users, tasks, storage, etc.)
 */
export const checkLimit = (
  limitType: "users" | "tasks" | "storage" | "apiCalls"
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.organization) {
      return next();
    }

    const limits = req.organization.limits;
    const limitValue =
      limits[`max${limitType.charAt(0).toUpperCase() + limitType.slice(1)}`];

    // -1 means unlimited
    if (limitValue === -1) {
      return next();
    }

    // TODO: Implement actual count checks based on limitType
    // This would query the database to count current usage

    next();
  };
};

// Helper functions
function extractSubdomain(host: string): string | undefined {
  const parts = host.split(".");
  // Handle localhost and IP addresses
  if (parts.length <= 2 || host.includes("localhost")) {
    return undefined;
  }
  return parts[0];
}

function formatOrganization(org: any) {
  return {
    id: org._id.toString(),
    slug: org.slug,
    name: org.name,
    branding: org.branding,
    legal: org.legal,
    support: org.support,
    subscription: org.subscription,
    limits: org.limits,
    settings: org.settings,
  };
}

function getMinimumPlanForFeature(feature: string): string {
  for (const [plan, config] of Object.entries(PLAN_LIMITS)) {
    if (config.features.includes(feature)) {
      return plan;
    }
  }
  return "enterprise";
}

export default {
  resolveOrganization,
  requireOrganization,
  requireFeature,
  checkLimit,
};

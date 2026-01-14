import mongoose, { Schema, Document } from "mongoose";

export interface IOrganization {
  id: string;
  name: string;
  slug: string; // URL-friendly unique identifier (e.g., "acme-corp")
  domain?: string; // Custom domain (e.g., "tasks.acmecorp.com")

  // Branding
  branding: {
    logo?: string;
    logoLight?: string; // For dark backgrounds
    favicon?: string;
    primaryColor?: string;
    accentColor?: string;
    companyName: string;
    tagline?: string;
  };

  // Legal & Compliance
  legal: {
    termsOfServiceUrl?: string;
    privacyPolicyUrl?: string;
    customTermsOfService?: string;
    customPrivacyPolicy?: string;
    dataProcessingAgreement?: string;
    cookiePolicyUrl?: string;
  };

  // Support Configuration
  support: {
    email?: string;
    phone?: string;
    websiteUrl?: string;
    documentationUrl?: string;
    chatEnabled?: boolean;
    chatProvider?: string;
    chatWidgetId?: string;
  };

  // Subscription & Billing
  subscription: {
    plan: "free" | "starter" | "professional" | "enterprise";
    status: "active" | "trialing" | "past_due" | "canceled" | "suspended";
    trialEndsAt?: Date;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  };

  // Limits based on plan
  limits: {
    maxUsers: number;
    maxTasks: number;
    maxStorage: number; // in bytes
    maxApiCalls: number; // per month
    features: string[]; // enabled features
  };

  // Settings
  settings: {
    defaultTimezone: string;
    defaultLanguage: string;
    dateFormat: string;
    allowPublicSignup: boolean;
    requireEmailVerification: boolean;
    allowedEmailDomains?: string[]; // Restrict signups to specific domains
    ssoEnabled: boolean;
    ssoProvider?: "google" | "microsoft" | "okta" | "saml";
    ssoConfig?: Record<string, any>;
  };

  // Metadata
  ownerId: string; // Primary owner/admin
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface OrganizationDocument
  extends Omit<IOrganization, "id">,
    Document {}

const organizationSchema = new Schema<OrganizationDocument>(
  {
    name: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      required: [true, "Organization slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-z0-9-]+$/,
        "Slug can only contain lowercase letters, numbers, and hyphens",
      ],
    },
    domain: {
      type: String,
      unique: true,
      sparse: true, // Allow multiple null values
      lowercase: true,
      trim: true,
    },

    branding: {
      logo: String,
      logoLight: String,
      favicon: String,
      primaryColor: { type: String, default: "#3b82f6" },
      accentColor: { type: String, default: "#8b5cf6" },
      companyName: { type: String, required: true },
      tagline: String,
    },

    legal: {
      termsOfServiceUrl: String,
      privacyPolicyUrl: String,
      customTermsOfService: String,
      customPrivacyPolicy: String,
      dataProcessingAgreement: String,
      cookiePolicyUrl: String,
    },

    support: {
      email: String,
      phone: String,
      websiteUrl: String,
      documentationUrl: String,
      chatEnabled: { type: Boolean, default: false },
      chatProvider: String,
      chatWidgetId: String,
    },

    subscription: {
      plan: {
        type: String,
        enum: ["free", "starter", "professional", "enterprise"],
        default: "free",
      },
      status: {
        type: String,
        enum: ["active", "trialing", "past_due", "canceled", "suspended"],
        default: "trialing",
      },
      trialEndsAt: Date,
      currentPeriodStart: Date,
      currentPeriodEnd: Date,
      stripeCustomerId: String,
      stripeSubscriptionId: String,
    },

    limits: {
      maxUsers: { type: Number, default: 5 },
      maxTasks: { type: Number, default: 100 },
      maxStorage: { type: Number, default: 1073741824 }, // 1GB
      maxApiCalls: { type: Number, default: 10000 },
      features: [{ type: String }],
    },

    settings: {
      defaultTimezone: { type: String, default: "UTC" },
      defaultLanguage: { type: String, default: "en" },
      dateFormat: { type: String, default: "MM/DD/YYYY" },
      allowPublicSignup: { type: Boolean, default: false },
      requireEmailVerification: { type: Boolean, default: true },
      allowedEmailDomains: [String],
      ssoEnabled: { type: Boolean, default: false },
      ssoProvider: {
        type: String,
        enum: ["google", "microsoft", "okta", "saml"],
      },
      ssoConfig: Schema.Types.Mixed,
    },

    ownerId: {
      type: String,
      ref: "TeamMember",
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret: Record<string, any>) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
organizationSchema.index({ slug: 1 }, { unique: true });
organizationSchema.index({ domain: 1 }, { unique: true, sparse: true });
organizationSchema.index({ ownerId: 1 });
organizationSchema.index({ "subscription.status": 1 });
organizationSchema.index({ isActive: 1 });

// Plan limits configuration
export const PLAN_LIMITS = {
  free: {
    maxUsers: 5,
    maxTasks: 100,
    maxStorage: 1073741824, // 1GB
    maxApiCalls: 10000,
    features: ["basic_tasks", "comments", "team_view"],
  },
  starter: {
    maxUsers: 25,
    maxTasks: 1000,
    maxStorage: 10737418240, // 10GB
    maxApiCalls: 50000,
    features: [
      "basic_tasks",
      "comments",
      "team_view",
      "analytics",
      "calendar",
      "export",
    ],
  },
  professional: {
    maxUsers: 100,
    maxTasks: 10000,
    maxStorage: 107374182400, // 100GB
    maxApiCalls: 200000,
    features: [
      "basic_tasks",
      "comments",
      "team_view",
      "analytics",
      "calendar",
      "export",
      "api_access",
      "custom_branding",
      "priority_support",
    ],
  },
  enterprise: {
    maxUsers: -1, // Unlimited
    maxTasks: -1,
    maxStorage: -1,
    maxApiCalls: -1,
    features: [
      "basic_tasks",
      "comments",
      "team_view",
      "analytics",
      "calendar",
      "export",
      "api_access",
      "custom_branding",
      "priority_support",
      "sso",
      "audit_logs",
      "custom_domain",
      "sla",
      "dedicated_support",
    ],
  },
};

const Organization = mongoose.model<OrganizationDocument>(
  "Organization",
  organizationSchema
);

export default Organization;

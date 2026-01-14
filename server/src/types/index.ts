// Type definitions for the Team Collaboration Hub

// Access levels for team members
export type AccessLevel = "owner" | "admin" | "member" | "viewer";

// Available permissions
export type Permission =
  | "manage_team"
  | "manage_roles"
  | "manage_permissions"
  | "create_tasks"
  | "assign_tasks"
  | "delete_tasks"
  | "edit_all_tasks"
  | "create_comments"
  | "delete_comments"
  | "manage_services"
  | "manage_workflows"
  | "manage_roadmap"
  | "view_analytics"
  | "export_data";

// Team member roles
export type TeamRole = "architect" | "developer" | "devops" | "product";

// Task status
export type TaskStatus = "todo" | "in-progress" | "review" | "done";

// Task priority
export type TaskPriority = "low" | "medium" | "high" | "critical";

// Context types for tasks and comments
export type ContextType = "service" | "workflow" | "roadmap" | "general";

// Activity types
export type ActivityType =
  | "comment"
  | "task-created"
  | "task-updated"
  | "task-assigned"
  | "mention"
  | "task-completed"
  | "status-changed";

// Subscription plans
export type SubscriptionPlan =
  | "free"
  | "starter"
  | "professional"
  | "enterprise";

// Subscription status
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "suspended";

// Reaction interface
export interface IReaction {
  emoji: string;
  userId: string;
}

// Organization interface
export interface IOrganization {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  branding: {
    logo?: string;
    logoLight?: string;
    favicon?: string;
    primaryColor: string;
    accentColor: string;
    companyName: string;
    tagline?: string;
  };
  legal: {
    termsOfServiceUrl?: string;
    privacyPolicyUrl?: string;
    customTermsOfService?: string;
    customPrivacyPolicy?: string;
    cookiePolicyUrl?: string;
  };
  support: {
    email?: string;
    phone?: string;
    websiteUrl?: string;
    documentationUrl?: string;
    chatEnabled?: boolean;
  };
  subscription: {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    trialEndsAt?: Date;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  };
  limits: {
    maxUsers: number;
    maxTasks: number;
    maxStorage: number;
    maxApiCalls: number;
    features: string[];
  };
  settings: {
    defaultTimezone: string;
    defaultLanguage: string;
    dateFormat: string;
    allowPublicSignup: boolean;
    requireEmailVerification: boolean;
    allowedEmailDomains?: string[];
    ssoEnabled: boolean;
    ssoProvider?: string;
    ssoConfig?: Record<string, any>;
  };
  ownerId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Team member interface
export interface ITeamMember {
  id: string;
  organizationId: string; // Added for multi-tenancy
  name: string;
  email: string;
  password?: string;
  role: TeamRole;
  accessLevel: AccessLevel;
  customPermissions?: Permission[];
  avatarUrl?: string;
  isOnline: boolean;
  lastSeen?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Comment interface
export interface IComment {
  id: string;
  organizationId: string; // Added for multi-tenancy
  authorId: string;
  content: string;
  timestamp: number;
  contextType: ContextType;
  contextId: string;
  replies: IComment[];
  reactions: IReaction[];
  mentions: string[];
  isResolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Task interface
export interface ITask {
  id: string;
  organizationId: string; // Added for multi-tenancy
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  creatorId: string;
  contextType: ContextType;
  contextId?: string;
  dueDate?: number;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  comments: string[];
  dependencies?: string[];
}

// Activity interface
export interface IActivity {
  id: string;
  organizationId: string; // Added for multi-tenancy
  userId: string;
  type: ActivityType;
  timestamp: number;
  contextType: string;
  contextId: string;
  content: string;
  metadata?: Record<string, any>;
}

// Backup interface
export interface IBackup {
  id: string;
  organizationId: string; // Added for multi-tenancy
  timestamp: number;
  data: string;
  userId: string;
  type: "manual" | "automatic";
}

// Data export interface
export interface IDataExport {
  version: string;
  exportDate: number;
  tasks: ITask[];
  comments: IComment[];
  teamMembers: Omit<ITeamMember, "password">[];
  settings: Record<string, any>;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Query parameters for pagination
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Task filter query
export interface TaskFilterQuery extends PaginationQuery {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  creatorId?: string;
  contextType?: ContextType;
  dueDate?: "overdue" | "today" | "this-week" | "no-due-date";
  tags?: string[];
  search?: string;
}

// Comment filter query
export interface CommentFilterQuery extends PaginationQuery {
  contextType?: ContextType;
  contextId?: string;
  authorId?: string;
  isResolved?: boolean;
}

// Team member filter query
export interface TeamMemberFilterQuery extends PaginationQuery {
  role?: TeamRole;
  accessLevel?: AccessLevel;
  isOnline?: boolean;
  search?: string;
}

// JWT Payload
export interface JwtPayload {
  userId: string;
  organizationId: string; // Added for multi-tenancy
  email: string;
  role: TeamRole;
  accessLevel: AccessLevel;
  iat?: number;
  exp?: number;
}

// Request with user
import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  organization?: {
    id: string;
    slug: string;
    name: string;
    branding: IOrganization["branding"];
    legal: IOrganization["legal"];
    support: IOrganization["support"];
    subscription: IOrganization["subscription"];
    limits: IOrganization["limits"];
    settings: IOrganization["settings"];
  };
}

// Workload statistics
export interface WorkloadStats {
  memberId: string;
  memberName: string;
  role: TeamRole;
  activeTasks: number;
  totalTasks: number;
  criticalTasks: number;
  highPriorityTasks: number;
  overdueTasks: number;
  workloadScore: number;
  workloadLevel: "low" | "balanced" | "high" | "overloaded";
}

// Data statistics
export interface DataStatistics {
  tasks: {
    total: number;
    byStatus: Record<TaskStatus, number>;
    byPriority: Record<TaskPriority, number>;
    overdue: number;
    dueSoon: number;
    withDependencies: number;
    unassigned: number;
    completedThisWeek: number;
  };
  comments: {
    total: number;
    resolved: number;
    unresolved: number;
    byContext: Record<ContextType, number>;
  };
  teamMembers: {
    total: number;
    online: number;
    offline: number;
    byRole: Record<TeamRole, number>;
    byAccessLevel: Record<AccessLevel, number>;
  };
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

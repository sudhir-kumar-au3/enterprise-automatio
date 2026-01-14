/**
 * Audit Trail / Activity Logging Service
 *
 * Features:
 * - Immutable audit logs for compliance
 * - User activity tracking
 * - Entity change history with diffs
 * - Search and filter capabilities
 * - Export functionality
 * - Retention policies
 * - Suspicious pattern detection and alerts
 * - Failed login monitoring
 * - Privilege escalation detection
 */

import { Schema, model, Document, Types } from "mongoose";
import logger from "../utils/logger";

// Audit Action Types
export enum AuditAction {
  // Authentication
  LOGIN = "auth.login",
  LOGOUT = "auth.logout",
  LOGIN_FAILED = "auth.login_failed",
  PASSWORD_CHANGED = "auth.password_changed",
  PASSWORD_RESET_REQUESTED = "auth.password_reset_requested",
  TWO_FACTOR_ENABLED = "auth.2fa_enabled",
  TWO_FACTOR_DISABLED = "auth.2fa_disabled",

  // User Management
  USER_CREATED = "user.created",
  USER_UPDATED = "user.updated",
  USER_DELETED = "user.deleted",
  USER_INVITED = "user.invited",
  USER_ACTIVATED = "user.activated",
  USER_DEACTIVATED = "user.deactivated",
  ROLE_CHANGED = "user.role_changed",

  // Team Management
  TEAM_CREATED = "team.created",
  TEAM_UPDATED = "team.updated",
  TEAM_DELETED = "team.deleted",
  MEMBER_ADDED = "team.member_added",
  MEMBER_REMOVED = "team.member_removed",
  MEMBER_ROLE_CHANGED = "team.member_role_changed",

  // Task Management
  TASK_CREATED = "task.created",
  TASK_UPDATED = "task.updated",
  TASK_DELETED = "task.deleted",
  TASK_ASSIGNED = "task.assigned",
  TASK_UNASSIGNED = "task.unassigned",
  TASK_STATUS_CHANGED = "task.status_changed",
  TASK_PRIORITY_CHANGED = "task.priority_changed",
  TASK_MOVED = "task.moved",
  TASK_ARCHIVED = "task.archived",
  TASK_RESTORED = "task.restored",

  // Comments & Attachments
  COMMENT_ADDED = "comment.added",
  COMMENT_UPDATED = "comment.updated",
  COMMENT_DELETED = "comment.deleted",
  ATTACHMENT_UPLOADED = "attachment.uploaded",
  ATTACHMENT_DELETED = "attachment.deleted",

  // Project/Board Management
  PROJECT_CREATED = "project.created",
  PROJECT_UPDATED = "project.updated",
  PROJECT_DELETED = "project.deleted",
  PROJECT_ARCHIVED = "project.archived",

  // Settings & Configuration
  SETTINGS_UPDATED = "settings.updated",
  INTEGRATION_ENABLED = "integration.enabled",
  INTEGRATION_DISABLED = "integration.disabled",
  WEBHOOK_CREATED = "webhook.created",
  WEBHOOK_DELETED = "webhook.deleted",

  // Data Operations
  DATA_EXPORTED = "data.exported",
  DATA_IMPORTED = "data.imported",
  BULK_OPERATION = "data.bulk_operation",

  // Security Events
  PERMISSION_GRANTED = "security.permission_granted",
  PERMISSION_REVOKED = "security.permission_revoked",
  SUSPICIOUS_ACTIVITY = "security.suspicious_activity",
  API_KEY_CREATED = "security.api_key_created",
  API_KEY_REVOKED = "security.api_key_revoked",
}

// Security Alert Types
export enum SecurityAlertType {
  MULTIPLE_FAILED_LOGINS = "multiple_failed_logins",
  BRUTE_FORCE_ATTEMPT = "brute_force_attempt",
  PRIVILEGE_ESCALATION = "privilege_escalation",
  UNUSUAL_ACTIVITY = "unusual_activity",
  ACCOUNT_LOCKOUT = "account_lockout",
  SUSPICIOUS_IP = "suspicious_ip",
  OFF_HOURS_ACCESS = "off_hours_access",
  MASS_DATA_ACCESS = "mass_data_access",
  RAPID_ACTIONS = "rapid_actions",
}

// Audit Log Entry Interface
export interface IAuditLog extends Document {
  // Core fields
  action: AuditAction;
  category: string;
  description: string;

  // Organization for multi-tenancy (SECURITY: Required for data isolation)
  organizationId: Types.ObjectId;

  // Actor information
  actorId: Types.ObjectId | null;
  actorEmail: string;
  actorName: string;
  actorType: "user" | "system" | "api" | "webhook";

  // Target entity
  entityType: string;
  entityId: string;
  entityName?: string;

  // Context
  teamId?: Types.ObjectId;
  projectId?: Types.ObjectId;

  // Change details
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  metadata?: Record<string, any>;

  // Request info
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;

  // Timestamps
  timestamp: Date;

  // Compliance
  retentionDate?: Date;
  isArchived: boolean;
}

// Security Alert Interface
export interface ISecurityAlert extends Document {
  alertType: SecurityAlertType;
  severity: "low" | "medium" | "high" | "critical";
  organizationId: Types.ObjectId;
  userId?: Types.ObjectId;
  userEmail?: string;
  ipAddress?: string;
  description: string;
  details: Record<string, any>;
  relatedAuditLogs: Types.ObjectId[];
  status: "new" | "investigating" | "resolved" | "dismissed";
  resolvedBy?: Types.ObjectId;
  resolvedAt?: Date;
  resolution?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Plain object type for lean queries (without Mongoose Document methods)
export type AuditLogData = Omit<IAuditLog, keyof Document>;
export type SecurityAlertData = Omit<ISecurityAlert, keyof Document>;

// Mongoose Schema
const auditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      required: true,
      enum: Object.values(AuditAction),
      index: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },

    // Organization for multi-tenancy (SECURITY: Required for data isolation)
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    actorEmail: String,
    actorName: String,
    actorType: {
      type: String,
      enum: ["user", "system", "api", "webhook"],
      default: "user",
    },

    entityType: {
      type: String,
      required: true,
      index: true,
    },
    entityId: {
      type: String,
      required: true,
      index: true,
    },
    entityName: String,

    teamId: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      index: true,
    },

    changes: [
      {
        field: String,
        oldValue: Schema.Types.Mixed,
        newValue: Schema.Types.Mixed,
      },
    ],
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },

    ipAddress: String,
    userAgent: String,
    requestId: String,

    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },

    retentionDate: Date,
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: false, // We use our own timestamp field
    collection: "audit_logs",
  }
);

// Security Alert Schema
const securityAlertSchema = new Schema<ISecurityAlert>(
  {
    alertType: {
      type: String,
      required: true,
      enum: Object.values(SecurityAlertType),
      index: true,
    },
    severity: {
      type: String,
      required: true,
      enum: ["low", "medium", "high", "critical"],
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    userEmail: String,
    ipAddress: String,
    description: {
      type: String,
      required: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    relatedAuditLogs: [
      {
        type: Schema.Types.ObjectId,
        ref: "AuditLog",
      },
    ],
    status: {
      type: String,
      enum: ["new", "investigating", "resolved", "dismissed"],
      default: "new",
      index: true,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    resolvedAt: Date,
    resolution: String,
  },
  {
    timestamps: true,
    collection: "security_alerts",
  }
);

// Compound indexes for common queries
auditLogSchema.index({ organizationId: 1, timestamp: -1 }); // Add org index
auditLogSchema.index({ organizationId: 1, teamId: 1, timestamp: -1 });
auditLogSchema.index({
  organizationId: 1,
  entityType: 1,
  entityId: 1,
  timestamp: -1,
});
auditLogSchema.index({ organizationId: 1, actorId: 1, timestamp: -1 });
auditLogSchema.index({ organizationId: 1, action: 1, timestamp: -1 });

// Indexes for security alerts
securityAlertSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
securityAlertSchema.index({ organizationId: 1, alertType: 1, createdAt: -1 });
securityAlertSchema.index({ organizationId: 1, severity: 1, status: 1 });

// Make the collection append-only (no updates allowed)
auditLogSchema.pre("updateOne", function () {
  throw new Error("Audit logs are immutable and cannot be updated");
});

auditLogSchema.pre("updateMany", function () {
  throw new Error("Audit logs are immutable and cannot be updated");
});

auditLogSchema.pre("findOneAndUpdate", function () {
  throw new Error("Audit logs are immutable and cannot be updated");
});

const AuditLog = model<IAuditLog>("AuditLog", auditLogSchema);
const SecurityAlert = model<ISecurityAlert>(
  "SecurityAlert",
  securityAlertSchema
);

// Query filter interface
export interface AuditLogFilter {
  organizationId: string; // Required for multi-tenancy
  actions?: AuditAction[];
  categories?: string[];
  actorId?: string;
  entityType?: string;
  entityId?: string;
  teamId?: string;
  projectId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  ipAddress?: string;
}

// Pagination options
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Configuration for suspicious pattern detection
interface SuspiciousPatternConfig {
  failedLoginThreshold: number;
  failedLoginWindowMinutes: number;
  bruteForceThreshold: number;
  bruteForceWindowMinutes: number;
  rapidActionsThreshold: number;
  rapidActionsWindowMinutes: number;
  offHoursStart: number; // Hour in 24h format
  offHoursEnd: number;
}

const defaultPatternConfig: SuspiciousPatternConfig = {
  failedLoginThreshold: 5,
  failedLoginWindowMinutes: 15,
  bruteForceThreshold: 10,
  bruteForceWindowMinutes: 5,
  rapidActionsThreshold: 100,
  rapidActionsWindowMinutes: 1,
  offHoursStart: 22, // 10 PM
  offHoursEnd: 6, // 6 AM
};

class AuditService {
  private defaultRetentionDays = 365; // 1 year retention
  private patternConfig: SuspiciousPatternConfig = defaultPatternConfig;
  private alertCallbacks: ((alert: ISecurityAlert) => void)[] = [];

  /**
   * Register a callback for security alerts
   */
  onSecurityAlert(callback: (alert: ISecurityAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Configure suspicious pattern detection thresholds
   */
  configurePatternDetection(config: Partial<SuspiciousPatternConfig>): void {
    this.patternConfig = { ...this.patternConfig, ...config };
  }

  /**
   * Log an audit event
   */
  async log(params: {
    action: AuditAction;
    organizationId: string | Types.ObjectId; // Required for multi-tenancy
    actorId?: string | Types.ObjectId | null;
    actorEmail?: string;
    actorName?: string;
    actorType?: "user" | "system" | "api" | "webhook";
    entityType: string;
    entityId: string;
    entityName?: string;
    teamId?: string | Types.ObjectId;
    projectId?: string | Types.ObjectId;
    changes?: { field: string; oldValue: any; newValue: any }[];
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
  }): Promise<IAuditLog> {
    const category = params.action.split(".")[0];
    const description = this.generateDescription(params.action, params);

    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() + this.defaultRetentionDays);

    const auditEntry = new AuditLog({
      action: params.action,
      category,
      description,
      organizationId: params.organizationId, // Required for multi-tenancy
      actorId: params.actorId || null,
      actorEmail: params.actorEmail || "system",
      actorName: params.actorName || "System",
      actorType: params.actorType || "user",
      entityType: params.entityType,
      entityId: params.entityId,
      entityName: params.entityName,
      teamId: params.teamId,
      projectId: params.projectId,
      changes: params.changes,
      metadata: params.metadata,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      requestId: params.requestId,
      timestamp: new Date(),
      retentionDate,
      isArchived: false,
    });

    await auditEntry.save();

    logger.debug("Audit log created", {
      action: params.action,
      organizationId: params.organizationId,
      entityType: params.entityType,
      entityId: params.entityId,
    });

    // Check for suspicious patterns asynchronously
    this.checkSuspiciousPatterns(auditEntry, params).catch((err) => {
      logger.error("Error checking suspicious patterns", { error: err });
    });

    return auditEntry;
  }

  /**
   * Generate human-readable description
   */
  private generateDescription(action: AuditAction, params: any): string {
    const actor = params.actorName || params.actorEmail || "Someone";
    const entity = params.entityName || params.entityType;

    const descriptions: Partial<Record<AuditAction, string>> = {
      [AuditAction.LOGIN]: `${actor} logged in`,
      [AuditAction.LOGOUT]: `${actor} logged out`,
      [AuditAction.LOGIN_FAILED]: `Failed login attempt for ${params.actorEmail}`,
      [AuditAction.PASSWORD_CHANGED]: `${actor} changed their password`,

      [AuditAction.USER_CREATED]: `${actor} created user ${entity}`,
      [AuditAction.USER_UPDATED]: `${actor} updated user ${entity}`,
      [AuditAction.USER_DELETED]: `${actor} deleted user ${entity}`,
      [AuditAction.USER_INVITED]: `${actor} invited ${entity} to the team`,

      [AuditAction.TEAM_CREATED]: `${actor} created team "${entity}"`,
      [AuditAction.TEAM_UPDATED]: `${actor} updated team "${entity}"`,
      [AuditAction.TEAM_DELETED]: `${actor} deleted team "${entity}"`,
      [AuditAction.MEMBER_ADDED]: `${actor} added a member to ${entity}`,
      [AuditAction.MEMBER_REMOVED]: `${actor} removed a member from ${entity}`,

      [AuditAction.TASK_CREATED]: `${actor} created task "${entity}"`,
      [AuditAction.TASK_UPDATED]: `${actor} updated task "${entity}"`,
      [AuditAction.TASK_DELETED]: `${actor} deleted task "${entity}"`,
      [AuditAction.TASK_ASSIGNED]: `${actor} assigned task "${entity}"`,
      [AuditAction.TASK_STATUS_CHANGED]: `${actor} changed status of "${entity}"`,

      [AuditAction.COMMENT_ADDED]: `${actor} commented on ${entity}`,
      [AuditAction.ATTACHMENT_UPLOADED]: `${actor} uploaded an attachment to ${entity}`,

      [AuditAction.PROJECT_CREATED]: `${actor} created project "${entity}"`,
      [AuditAction.PROJECT_UPDATED]: `${actor} updated project "${entity}"`,
      [AuditAction.PROJECT_DELETED]: `${actor} deleted project "${entity}"`,

      [AuditAction.SETTINGS_UPDATED]: `${actor} updated settings`,
      [AuditAction.DATA_EXPORTED]: `${actor} exported data`,
    };

    return descriptions[action] || `${actor} performed ${action} on ${entity}`;
  }

  /**
   * Check for suspicious patterns after logging an event
   */
  private async checkSuspiciousPatterns(
    auditEntry: IAuditLog,
    params: any
  ): Promise<void> {
    const checks: Promise<void>[] = [];

    // Check for failed login patterns
    if (params.action === AuditAction.LOGIN_FAILED) {
      checks.push(this.checkFailedLoginPattern(auditEntry, params));
    }

    // Check for privilege escalation
    if (
      params.action === AuditAction.ROLE_CHANGED ||
      params.action === AuditAction.PERMISSION_GRANTED
    ) {
      checks.push(this.checkPrivilegeEscalation(auditEntry, params));
    }

    // Check for rapid actions (potential automated attacks)
    if (params.actorId) {
      checks.push(this.checkRapidActions(auditEntry, params));
    }

    // Check for off-hours access
    if (params.action === AuditAction.LOGIN) {
      checks.push(this.checkOffHoursAccess(auditEntry, params));
    }

    await Promise.all(checks);
  }

  /**
   * Check for multiple failed login attempts
   */
  private async checkFailedLoginPattern(
    auditEntry: IAuditLog,
    params: any
  ): Promise<void> {
    const windowStart = new Date();
    windowStart.setMinutes(
      windowStart.getMinutes() - this.patternConfig.failedLoginWindowMinutes
    );

    // Count failed logins by IP address
    const failedLoginsByIP = await AuditLog.countDocuments({
      organizationId: auditEntry.organizationId,
      action: AuditAction.LOGIN_FAILED,
      ipAddress: params.ipAddress,
      timestamp: { $gte: windowStart },
    });

    // Count failed logins by email
    const failedLoginsByEmail = await AuditLog.countDocuments({
      organizationId: auditEntry.organizationId,
      action: AuditAction.LOGIN_FAILED,
      actorEmail: params.actorEmail,
      timestamp: { $gte: windowStart },
    });

    // Check for brute force (higher threshold, shorter window)
    const bruteForceWindowStart = new Date();
    bruteForceWindowStart.setMinutes(
      bruteForceWindowStart.getMinutes() -
        this.patternConfig.bruteForceWindowMinutes
    );

    const bruteForceAttempts = await AuditLog.countDocuments({
      organizationId: auditEntry.organizationId,
      action: AuditAction.LOGIN_FAILED,
      ipAddress: params.ipAddress,
      timestamp: { $gte: bruteForceWindowStart },
    });

    // Create alerts based on thresholds
    if (bruteForceAttempts >= this.patternConfig.bruteForceThreshold) {
      await this.createSecurityAlert({
        alertType: SecurityAlertType.BRUTE_FORCE_ATTEMPT,
        severity: "critical",
        organizationId: auditEntry.organizationId,
        userEmail: params.actorEmail,
        ipAddress: params.ipAddress,
        description: `Potential brute force attack detected: ${bruteForceAttempts} failed login attempts from IP ${params.ipAddress} in ${this.patternConfig.bruteForceWindowMinutes} minutes`,
        details: {
          attemptCount: bruteForceAttempts,
          windowMinutes: this.patternConfig.bruteForceWindowMinutes,
          targetEmail: params.actorEmail,
        },
        relatedAuditLogs: [auditEntry._id],
      });
    } else if (failedLoginsByIP >= this.patternConfig.failedLoginThreshold) {
      await this.createSecurityAlert({
        alertType: SecurityAlertType.MULTIPLE_FAILED_LOGINS,
        severity: "high",
        organizationId: auditEntry.organizationId,
        userEmail: params.actorEmail,
        ipAddress: params.ipAddress,
        description: `Multiple failed login attempts detected: ${failedLoginsByIP} attempts from IP ${params.ipAddress} in ${this.patternConfig.failedLoginWindowMinutes} minutes`,
        details: {
          attemptsByIP: failedLoginsByIP,
          attemptsByEmail: failedLoginsByEmail,
          windowMinutes: this.patternConfig.failedLoginWindowMinutes,
        },
        relatedAuditLogs: [auditEntry._id],
      });
    } else if (failedLoginsByEmail >= this.patternConfig.failedLoginThreshold) {
      await this.createSecurityAlert({
        alertType: SecurityAlertType.MULTIPLE_FAILED_LOGINS,
        severity: "medium",
        organizationId: auditEntry.organizationId,
        userEmail: params.actorEmail,
        ipAddress: params.ipAddress,
        description: `Multiple failed login attempts for account ${params.actorEmail}: ${failedLoginsByEmail} attempts in ${this.patternConfig.failedLoginWindowMinutes} minutes`,
        details: {
          attemptsByEmail: failedLoginsByEmail,
          windowMinutes: this.patternConfig.failedLoginWindowMinutes,
          ipAddresses: await this.getRecentIPsForEmail(
            auditEntry.organizationId,
            params.actorEmail,
            windowStart
          ),
        },
        relatedAuditLogs: [auditEntry._id],
      });
    }
  }

  /**
   * Get recent IP addresses used for login attempts by email
   */
  private async getRecentIPsForEmail(
    organizationId: Types.ObjectId,
    email: string,
    since: Date
  ): Promise<string[]> {
    const logs = await AuditLog.find({
      organizationId,
      action: AuditAction.LOGIN_FAILED,
      actorEmail: email,
      timestamp: { $gte: since },
    }).distinct("ipAddress");

    return logs;
  }

  /**
   * Check for privilege escalation attempts
   */
  private async checkPrivilegeEscalation(
    auditEntry: IAuditLog,
    params: any
  ): Promise<void> {
    const changes = params.changes || [];

    // Check if role was changed to admin/owner
    const roleChange = changes.find((c: any) => c.field === "role");
    if (roleChange) {
      const sensitiveRoles = ["admin", "owner", "super_admin"];
      const isEscalation = sensitiveRoles.includes(
        roleChange.newValue?.toLowerCase()
      );

      if (isEscalation) {
        // Check if the actor is changing their own role (self-escalation)
        const isSelfEscalation =
          params.actorId?.toString() === params.entityId?.toString();

        await this.createSecurityAlert({
          alertType: SecurityAlertType.PRIVILEGE_ESCALATION,
          severity: isSelfEscalation ? "critical" : "high",
          organizationId: auditEntry.organizationId,
          userId: params.actorId
            ? new Types.ObjectId(params.actorId)
            : undefined,
          userEmail: params.actorEmail,
          ipAddress: params.ipAddress,
          description: isSelfEscalation
            ? `Self privilege escalation attempt: User ${params.actorEmail} attempted to change their own role to ${roleChange.newValue}`
            : `Privilege escalation: User ${
                params.actorEmail
              } changed role of ${params.entityName || params.entityId} from ${
                roleChange.oldValue
              } to ${roleChange.newValue}`,
          details: {
            isSelfEscalation,
            targetUserId: params.entityId,
            targetUserName: params.entityName,
            oldRole: roleChange.oldValue,
            newRole: roleChange.newValue,
            changedBy: params.actorEmail,
          },
          relatedAuditLogs: [auditEntry._id],
        });
      }
    }

    // Check for sensitive permission grants
    if (params.action === AuditAction.PERMISSION_GRANTED) {
      const sensitivePermissions = [
        "admin",
        "delete",
        "manage_users",
        "manage_billing",
        "api_access",
      ];
      const grantedPermission =
        params.metadata?.permission || params.entityName;

      if (
        sensitivePermissions.some((p) =>
          grantedPermission?.toLowerCase().includes(p)
        )
      ) {
        await this.createSecurityAlert({
          alertType: SecurityAlertType.PRIVILEGE_ESCALATION,
          severity: "medium",
          organizationId: auditEntry.organizationId,
          userId: params.actorId
            ? new Types.ObjectId(params.actorId)
            : undefined,
          userEmail: params.actorEmail,
          ipAddress: params.ipAddress,
          description: `Sensitive permission granted: ${params.actorEmail} granted ${grantedPermission} permission`,
          details: {
            permission: grantedPermission,
            targetUserId: params.entityId,
            grantedBy: params.actorEmail,
          },
          relatedAuditLogs: [auditEntry._id],
        });
      }
    }
  }

  /**
   * Check for rapid/automated actions (potential bot activity)
   */
  private async checkRapidActions(
    auditEntry: IAuditLog,
    params: any
  ): Promise<void> {
    const windowStart = new Date();
    windowStart.setMinutes(
      windowStart.getMinutes() - this.patternConfig.rapidActionsWindowMinutes
    );

    const actionCount = await AuditLog.countDocuments({
      organizationId: auditEntry.organizationId,
      actorId: new Types.ObjectId(params.actorId),
      timestamp: { $gte: windowStart },
    });

    if (actionCount >= this.patternConfig.rapidActionsThreshold) {
      // Check if we already have an active alert for this user
      const existingAlert = await SecurityAlert.findOne({
        organizationId: auditEntry.organizationId,
        userId: new Types.ObjectId(params.actorId),
        alertType: SecurityAlertType.RAPID_ACTIONS,
        status: { $in: ["new", "investigating"] },
        createdAt: { $gte: windowStart },
      });

      if (!existingAlert) {
        await this.createSecurityAlert({
          alertType: SecurityAlertType.RAPID_ACTIONS,
          severity: "medium",
          organizationId: auditEntry.organizationId,
          userId: new Types.ObjectId(params.actorId),
          userEmail: params.actorEmail,
          ipAddress: params.ipAddress,
          description: `Unusual activity detected: User ${params.actorEmail} performed ${actionCount} actions in ${this.patternConfig.rapidActionsWindowMinutes} minute(s)`,
          details: {
            actionCount,
            windowMinutes: this.patternConfig.rapidActionsWindowMinutes,
            threshold: this.patternConfig.rapidActionsThreshold,
          },
          relatedAuditLogs: [auditEntry._id],
        });
      }
    }
  }

  /**
   * Check for off-hours access
   */
  private async checkOffHoursAccess(
    auditEntry: IAuditLog,
    params: any
  ): Promise<void> {
    const currentHour = new Date().getHours();
    const isOffHours =
      currentHour >= this.patternConfig.offHoursStart ||
      currentHour < this.patternConfig.offHoursEnd;

    if (isOffHours && params.actorId) {
      // Check if this user typically logs in during off-hours
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const offHoursLogins = await AuditLog.countDocuments({
        organizationId: auditEntry.organizationId,
        actorId: new Types.ObjectId(params.actorId),
        action: AuditAction.LOGIN,
        timestamp: { $gte: thirtyDaysAgo },
        $expr: {
          $or: [
            {
              $gte: [{ $hour: "$timestamp" }, this.patternConfig.offHoursStart],
            },
            { $lt: [{ $hour: "$timestamp" }, this.patternConfig.offHoursEnd] },
          ],
        },
      });

      // If this is unusual behavior (less than 3 off-hours logins in 30 days)
      if (offHoursLogins < 3) {
        await this.createSecurityAlert({
          alertType: SecurityAlertType.OFF_HOURS_ACCESS,
          severity: "low",
          organizationId: auditEntry.organizationId,
          userId: new Types.ObjectId(params.actorId),
          userEmail: params.actorEmail,
          ipAddress: params.ipAddress,
          description: `Off-hours login detected: User ${
            params.actorEmail
          } logged in at ${new Date().toISOString()} (outside normal hours)`,
          details: {
            loginTime: new Date().toISOString(),
            localHour: currentHour,
            previousOffHoursLogins: offHoursLogins,
            offHoursRange: `${this.patternConfig.offHoursStart}:00 - ${this.patternConfig.offHoursEnd}:00`,
          },
          relatedAuditLogs: [auditEntry._id],
        });
      }
    }
  }

  /**
   * Create a security alert
   */
  async createSecurityAlert(params: {
    alertType: SecurityAlertType;
    severity: "low" | "medium" | "high" | "critical";
    organizationId: Types.ObjectId;
    userId?: Types.ObjectId;
    userEmail?: string;
    ipAddress?: string;
    description: string;
    details: Record<string, any>;
    relatedAuditLogs?: Types.ObjectId[];
  }): Promise<ISecurityAlert> {
    const alert = new SecurityAlert({
      alertType: params.alertType,
      severity: params.severity,
      organizationId: params.organizationId,
      userId: params.userId,
      userEmail: params.userEmail,
      ipAddress: params.ipAddress,
      description: params.description,
      details: params.details,
      relatedAuditLogs: params.relatedAuditLogs || [],
      status: "new",
    });

    await alert.save();

    logger.warn("Security alert created", {
      alertType: params.alertType,
      severity: params.severity,
      organizationId: params.organizationId,
      description: params.description,
    });

    // Also log to audit trail
    await this.log({
      action: AuditAction.SUSPICIOUS_ACTIVITY,
      organizationId: params.organizationId,
      actorId: params.userId || null,
      actorEmail: params.userEmail || "system",
      actorName: params.userEmail || "Security System",
      actorType: "system",
      entityType: "security_alert",
      entityId: alert._id.toString(),
      entityName: params.alertType,
      metadata: {
        alertType: params.alertType,
        severity: params.severity,
        ...params.details,
      },
      ipAddress: params.ipAddress,
    });

    // Notify registered callbacks
    this.alertCallbacks.forEach((callback) => {
      try {
        callback(alert);
      } catch (err) {
        logger.error("Error in security alert callback", { error: err });
      }
    });

    return alert;
  }

  /**
   * Query audit logs with filters
   */
  async query(
    filter: AuditLogFilter,
    pagination: PaginationOptions = {}
  ): Promise<{
    logs: AuditLogData[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 50,
      sortBy = "timestamp",
      sortOrder = "desc",
    } = pagination;

    const query: any = {
      isArchived: false,
      organizationId: new Types.ObjectId(filter.organizationId), // Required for multi-tenancy
    };

    if (filter.actions?.length) {
      query.action = { $in: filter.actions };
    }
    if (filter.categories?.length) {
      query.category = { $in: filter.categories };
    }
    if (filter.actorId) {
      query.actorId = new Types.ObjectId(filter.actorId);
    }
    if (filter.entityType) {
      query.entityType = filter.entityType;
    }
    if (filter.entityId) {
      query.entityId = filter.entityId;
    }
    if (filter.teamId) {
      query.teamId = new Types.ObjectId(filter.teamId);
    }
    if (filter.projectId) {
      query.projectId = new Types.ObjectId(filter.projectId);
    }
    if (filter.ipAddress) {
      query.ipAddress = filter.ipAddress;
    }
    if (filter.startDate || filter.endDate) {
      query.timestamp = {};
      if (filter.startDate) {
        query.timestamp.$gte = filter.startDate;
      }
      if (filter.endDate) {
        query.timestamp.$lte = filter.endDate;
      }
    }
    if (filter.search) {
      query.$or = [
        { description: { $regex: filter.search, $options: "i" } },
        { entityName: { $regex: filter.search, $options: "i" } },
        { actorEmail: { $regex: filter.search, $options: "i" } },
      ];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get entity history (all changes to a specific entity)
   */
  async getEntityHistory(
    organizationId: string,
    entityType: string,
    entityId: string,
    limit = 100
  ) {
    return AuditLog.find({
      organizationId: new Types.ObjectId(organizationId),
      entityType,
      entityId,
      isArchived: false,
    })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get user activity history
   */
  async getUserActivity(
    organizationId: string,
    userId: string,
    options: { startDate?: Date; endDate?: Date; limit?: number } = {}
  ) {
    const query: any = {
      organizationId: new Types.ObjectId(organizationId),
      actorId: new Types.ObjectId(userId),
      isArchived: false,
    };

    if (options.startDate || options.endDate) {
      query.timestamp = {};
      if (options.startDate) query.timestamp.$gte = options.startDate;
      if (options.endDate) query.timestamp.$lte = options.endDate;
    }

    return AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(options.limit || 100)
      .lean();
  }

  /**
   * Get activity feed for a team
   */
  async getTeamActivityFeed(
    organizationId: string,
    teamId: string,
    options: { limit?: number; before?: Date } = {}
  ) {
    const query: any = {
      organizationId: new Types.ObjectId(organizationId),
      teamId: new Types.ObjectId(teamId),
      isArchived: false,
      // Exclude sensitive actions from feed
      action: {
        $nin: [
          AuditAction.LOGIN,
          AuditAction.LOGOUT,
          AuditAction.PASSWORD_CHANGED,
          AuditAction.LOGIN_FAILED,
        ],
      },
    };

    if (options.before) {
      query.timestamp = { $lt: options.before };
    }

    return AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(options.limit || 50)
      .lean();
  }

  /**
   * Get security events
   */
  async getSecurityEvents(
    organizationId: string,
    teamId?: string,
    options: { startDate?: Date; endDate?: Date } = {}
  ) {
    const securityActions = [
      AuditAction.LOGIN_FAILED,
      AuditAction.PASSWORD_CHANGED,
      AuditAction.PASSWORD_RESET_REQUESTED,
      AuditAction.TWO_FACTOR_ENABLED,
      AuditAction.TWO_FACTOR_DISABLED,
      AuditAction.PERMISSION_GRANTED,
      AuditAction.PERMISSION_REVOKED,
      AuditAction.SUSPICIOUS_ACTIVITY,
      AuditAction.API_KEY_CREATED,
      AuditAction.API_KEY_REVOKED,
      AuditAction.USER_DEACTIVATED,
    ];

    const query: any = {
      organizationId: new Types.ObjectId(organizationId),
      action: { $in: securityActions },
      isArchived: false,
    };

    if (teamId) {
      query.teamId = new Types.ObjectId(teamId);
    }

    if (options.startDate || options.endDate) {
      query.timestamp = {};
      if (options.startDate) query.timestamp.$gte = options.startDate;
      if (options.endDate) query.timestamp.$lte = options.endDate;
    }

    return AuditLog.find(query).sort({ timestamp: -1 }).limit(1000).lean();
  }

  /**
   * Export audit logs
   */
  async exportLogs(
    filter: AuditLogFilter,
    format: "json" | "csv" = "json"
  ): Promise<string> {
    const { logs } = await this.query(filter, { limit: 10000 });

    if (format === "csv") {
      const headers = [
        "Timestamp",
        "Action",
        "Category",
        "Description",
        "Actor",
        "Actor Email",
        "Entity Type",
        "Entity ID",
        "Entity Name",
        "IP Address",
      ];

      const rows = logs.map((log) => [
        log.timestamp.toISOString(),
        log.action,
        log.category,
        `"${log.description.replace(/"/g, '""')}"`,
        log.actorName,
        log.actorEmail,
        log.entityType,
        log.entityId,
        log.entityName || "",
        log.ipAddress || "",
      ]);

      return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    }

    return JSON.stringify(logs, null, 2);
  }

  /**
   * Get audit statistics
   */
  async getStatistics(
    organizationId: string,
    teamId?: string,
    days = 30
  ): Promise<{
    totalEvents: number;
    eventsByCategory: Record<string, number>;
    eventsByDay: { date: string; count: number }[];
    topActors: { actorId: string; actorName: string; count: number }[];
    securityAlerts: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const matchStage: any = {
      organizationId: new Types.ObjectId(organizationId),
      timestamp: { $gte: startDate },
      isArchived: false,
    };

    if (teamId) {
      matchStage.teamId = new Types.ObjectId(teamId);
    }

    const [
      totalEvents,
      eventsByCategory,
      eventsByDay,
      topActors,
      securityAlerts,
    ] = await Promise.all([
      // Total events
      AuditLog.countDocuments(matchStage),

      // Events by category
      AuditLog.aggregate([
        { $match: matchStage },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),

      // Events by day
      AuditLog.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Top actors
      AuditLog.aggregate([
        { $match: { ...matchStage, actorType: "user" } },
        {
          $group: {
            _id: "$actorId",
            actorName: { $first: "$actorName" },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // Security alerts
      AuditLog.countDocuments({
        ...matchStage,
        action: {
          $in: [AuditAction.LOGIN_FAILED, AuditAction.SUSPICIOUS_ACTIVITY],
        },
      }),
    ]);

    return {
      totalEvents,
      eventsByCategory: Object.fromEntries(
        eventsByCategory.map((e: any) => [e._id, e.count])
      ),
      eventsByDay: eventsByDay.map((e: any) => ({
        date: e._id,
        count: e.count,
      })),
      topActors: topActors.map((a: any) => ({
        actorId: a._id?.toString() || "system",
        actorName: a.actorName,
        count: a.count,
      })),
      securityAlerts,
    };
  }

  /**
   * Archive old logs (for retention)
   */
  async archiveOldLogs(): Promise<number> {
    const result = await AuditLog.updateMany(
      {
        retentionDate: { $lt: new Date() },
        isArchived: false,
      },
      { $set: { isArchived: true } }
    );

    logger.info(`Archived ${result.modifiedCount} audit logs`);
    return result.modifiedCount;
  }

  /**
   * Delete archived logs (permanent deletion after extended retention)
   */
  async deleteArchivedLogs(olderThanDays = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await AuditLog.deleteMany({
      isArchived: true,
      retentionDate: { $lt: cutoffDate },
    });

    logger.info(`Deleted ${result.deletedCount} archived audit logs`);
    return result.deletedCount;
  }

  /**
   * Get security alerts for an organization
   */
  async getSecurityAlerts(
    organizationId: string,
    options: {
      status?: ("new" | "investigating" | "resolved" | "dismissed")[];
      severity?: ("low" | "medium" | "high" | "critical")[];
      alertTypes?: SecurityAlertType[];
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      page?: number;
    } = {}
  ): Promise<{
    alerts: SecurityAlertData[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { limit = 50, page = 1 } = options;
    const query: any = {
      organizationId: new Types.ObjectId(organizationId),
    };

    if (options.status?.length) {
      query.status = { $in: options.status };
    }
    if (options.severity?.length) {
      query.severity = { $in: options.severity };
    }
    if (options.alertTypes?.length) {
      query.alertType = { $in: options.alertTypes };
    }
    if (options.startDate || options.endDate) {
      query.createdAt = {};
      if (options.startDate) query.createdAt.$gte = options.startDate;
      if (options.endDate) query.createdAt.$lte = options.endDate;
    }

    const [alerts, total] = await Promise.all([
      SecurityAlert.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      SecurityAlert.countDocuments(query),
    ]);

    return {
      alerts: alerts as SecurityAlertData[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update security alert status
   */
  async updateAlertStatus(
    alertId: string,
    status: "investigating" | "resolved" | "dismissed",
    resolvedBy?: string,
    resolution?: string
  ): Promise<ISecurityAlert | null> {
    const update: any = { status };

    if (status === "resolved" || status === "dismissed") {
      update.resolvedAt = new Date();
      if (resolvedBy) update.resolvedBy = new Types.ObjectId(resolvedBy);
      if (resolution) update.resolution = resolution;
    }

    const alert = await SecurityAlert.findByIdAndUpdate(alertId, update, {
      new: true,
    });

    if (alert) {
      logger.info("Security alert status updated", {
        alertId,
        newStatus: status,
        resolvedBy,
      });
    }

    return alert;
  }

  /**
   * Get alert statistics
   */
  async getAlertStatistics(
    organizationId: string,
    days = 30
  ): Promise<{
    totalAlerts: number;
    alertsBySeverity: Record<string, number>;
    alertsByType: Record<string, number>;
    alertsByStatus: Record<string, number>;
    alertsOverTime: { date: string; count: number }[];
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const matchStage = {
      organizationId: new Types.ObjectId(organizationId),
      createdAt: { $gte: startDate },
    };

    const [totalAlerts, bySeverity, byType, byStatus, overTime] =
      await Promise.all([
        SecurityAlert.countDocuments(matchStage),
        SecurityAlert.aggregate([
          { $match: matchStage },
          { $group: { _id: "$severity", count: { $sum: 1 } } },
        ]),
        SecurityAlert.aggregate([
          { $match: matchStage },
          { $group: { _id: "$alertType", count: { $sum: 1 } } },
        ]),
        SecurityAlert.aggregate([
          { $match: matchStage },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        SecurityAlert.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

    return {
      totalAlerts,
      alertsBySeverity: Object.fromEntries(
        bySeverity.map((e: any) => [e._id, e.count])
      ),
      alertsByType: Object.fromEntries(
        byType.map((e: any) => [e._id, e.count])
      ),
      alertsByStatus: Object.fromEntries(
        byStatus.map((e: any) => [e._id, e.count])
      ),
      alertsOverTime: overTime.map((e: any) => ({
        date: e._id,
        count: e.count,
      })),
    };
  }
}

// Middleware helper to extract request context
export function getRequestContext(req: any): {
  ipAddress: string;
  userAgent: string;
  requestId: string;
} {
  return {
    ipAddress:
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "unknown",
    userAgent: req.headers["user-agent"] || "unknown",
    requestId: req.headers["x-request-id"] || req.id || "",
  };
}

// Calculate diff between two objects
export function calculateChanges(
  oldObj: Record<string, any>,
  newObj: Record<string, any>,
  fieldsToTrack?: string[]
): { field: string; oldValue: any; newValue: any }[] {
  const changes: { field: string; oldValue: any; newValue: any }[] = [];
  const fields = fieldsToTrack || [
    ...new Set([...Object.keys(oldObj), ...Object.keys(newObj)]),
  ];

  for (const field of fields) {
    const oldValue = oldObj[field];
    const newValue = newObj[field];

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({ field, oldValue, newValue });
    }
  }

  return changes;
}

// Export singleton
export const auditService = new AuditService();
export { AuditLog, SecurityAlert };
export default auditService;

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

// Plain object type for lean queries (without Mongoose Document methods)
export type AuditLogData = Omit<IAuditLog, keyof Document>;

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

class AuditService {
  private defaultRetentionDays = 365; // 1 year retention

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
export { AuditLog };
export default auditService;

/**
 * Audit Logging Service
 * Enterprise-grade audit trail for security and compliance
 * Tracks all sensitive operations for forensics and compliance
 */

import mongoose, { Schema, Document } from "mongoose";
import logger from "./logger";

// Audit event types
export type AuditEventType =
  | "AUTH_LOGIN"
  | "AUTH_LOGOUT"
  | "AUTH_LOGIN_FAILED"
  | "AUTH_PASSWORD_CHANGE"
  | "AUTH_TOKEN_REFRESH"
  | "USER_CREATE"
  | "USER_UPDATE"
  | "USER_DELETE"
  | "USER_ROLE_CHANGE"
  | "USER_PERMISSION_CHANGE"
  | "TASK_CREATE"
  | "TASK_UPDATE"
  | "TASK_DELETE"
  | "TASK_STATUS_CHANGE"
  | "TASK_ASSIGN"
  | "DATA_EXPORT"
  | "DATA_IMPORT"
  | "DATA_BACKUP"
  | "DATA_RESTORE"
  | "SETTINGS_CHANGE"
  | "API_KEY_CREATE"
  | "API_KEY_REVOKE"
  | "SECURITY_ALERT";

export type AuditSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface AuditLogEntry {
  timestamp: Date;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  resourceType?: string;
  resourceId?: string;
  action: string;
  details?: Record<string, any>;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  success: boolean;
  errorMessage?: string;
  requestId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

interface AuditLogDocument extends AuditLogEntry, Document {}

// MongoDB Schema for audit logs
const auditLogSchema = new Schema<AuditLogDocument>(
  {
    timestamp: { type: Date, default: Date.now, index: true },
    eventType: {
      type: String,
      required: true,
      enum: [
        "AUTH_LOGIN",
        "AUTH_LOGOUT",
        "AUTH_LOGIN_FAILED",
        "AUTH_PASSWORD_CHANGE",
        "AUTH_TOKEN_REFRESH",
        "USER_CREATE",
        "USER_UPDATE",
        "USER_DELETE",
        "USER_ROLE_CHANGE",
        "USER_PERMISSION_CHANGE",
        "TASK_CREATE",
        "TASK_UPDATE",
        "TASK_DELETE",
        "TASK_STATUS_CHANGE",
        "TASK_ASSIGN",
        "DATA_EXPORT",
        "DATA_IMPORT",
        "DATA_BACKUP",
        "DATA_RESTORE",
        "SETTINGS_CHANGE",
        "API_KEY_CREATE",
        "API_KEY_REVOKE",
        "SECURITY_ALERT",
      ],
      index: true,
    },
    severity: {
      type: String,
      enum: ["INFO", "WARNING", "CRITICAL"],
      default: "INFO",
      index: true,
    },
    userId: { type: String, index: true },
    userEmail: { type: String, index: true },
    userRole: { type: String },
    ipAddress: { type: String, index: true },
    userAgent: { type: String },
    resourceType: { type: String, index: true },
    resourceId: { type: String, index: true },
    action: { type: String, required: true },
    details: { type: Schema.Types.Mixed },
    previousState: { type: Schema.Types.Mixed },
    newState: { type: Schema.Types.Mixed },
    success: { type: Boolean, default: true, index: true },
    errorMessage: { type: String },
    requestId: { type: String, index: true },
    sessionId: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: false,
    collection: "audit_logs",
  }
);

// Compound indexes for common queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ eventType: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });
auditLogSchema.index({ success: 1, severity: 1, timestamp: -1 });

// TTL index - auto-delete logs older than 2 years (compliance requirement)
auditLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 }
);

const AuditLog = mongoose.model<AuditLogDocument>("AuditLog", auditLogSchema);

// Severity mapping for event types
const eventSeverityMap: Record<AuditEventType, AuditSeverity> = {
  AUTH_LOGIN: "INFO",
  AUTH_LOGOUT: "INFO",
  AUTH_LOGIN_FAILED: "WARNING",
  AUTH_PASSWORD_CHANGE: "WARNING",
  AUTH_TOKEN_REFRESH: "INFO",
  USER_CREATE: "INFO",
  USER_UPDATE: "INFO",
  USER_DELETE: "WARNING",
  USER_ROLE_CHANGE: "WARNING",
  USER_PERMISSION_CHANGE: "WARNING",
  TASK_CREATE: "INFO",
  TASK_UPDATE: "INFO",
  TASK_DELETE: "WARNING",
  TASK_STATUS_CHANGE: "INFO",
  TASK_ASSIGN: "INFO",
  DATA_EXPORT: "WARNING",
  DATA_IMPORT: "WARNING",
  DATA_BACKUP: "INFO",
  DATA_RESTORE: "CRITICAL",
  SETTINGS_CHANGE: "WARNING",
  API_KEY_CREATE: "WARNING",
  API_KEY_REVOKE: "WARNING",
  SECURITY_ALERT: "CRITICAL",
};

class AuditService {
  private static instance: AuditService;
  private writeQueue: AuditLogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly batchSize = 100;
  private readonly flushIntervalMs = 5000;

  private constructor() {
    this.startFlushInterval();
  }

  static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);
  }

  private async flush(): Promise<void> {
    if (this.writeQueue.length === 0) return;

    const entries = this.writeQueue.splice(0, this.batchSize);
    try {
      await AuditLog.insertMany(entries, { ordered: false });
    } catch (error) {
      logger.error("Failed to flush audit logs", {
        error,
        count: entries.length,
      });
      // Re-queue failed entries (with limit to prevent memory issues)
      if (this.writeQueue.length < 1000) {
        this.writeQueue.unshift(...entries);
      }
    }
  }

  /**
   * Log an audit event
   */
  async log(
    entry: Omit<AuditLogEntry, "timestamp" | "severity">
  ): Promise<void> {
    const auditEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date(),
      severity: eventSeverityMap[entry.eventType] || "INFO",
    };

    // Add to write queue for batch processing
    this.writeQueue.push(auditEntry);

    // Flush immediately if queue is full
    if (this.writeQueue.length >= this.batchSize) {
      await this.flush();
    }

    // Log critical events immediately to file
    if (auditEntry.severity === "CRITICAL") {
      logger.warn("AUDIT CRITICAL", {
        eventType: auditEntry.eventType,
        userId: auditEntry.userId,
        action: auditEntry.action,
        resourceId: auditEntry.resourceId,
      });
    }
  }

  /**
   * Log authentication event
   */
  async logAuth(
    eventType:
      | "AUTH_LOGIN"
      | "AUTH_LOGOUT"
      | "AUTH_LOGIN_FAILED"
      | "AUTH_PASSWORD_CHANGE"
      | "AUTH_TOKEN_REFRESH",
    userId: string | undefined,
    userEmail: string,
    success: boolean,
    context: {
      ipAddress?: string;
      userAgent?: string;
      requestId?: string;
      errorMessage?: string;
    }
  ): Promise<void> {
    await this.log({
      eventType,
      userId,
      userEmail,
      action: eventType.toLowerCase().replace(/_/g, " "),
      success,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      requestId: context.requestId,
      errorMessage: context.errorMessage,
    });
  }

  /**
   * Log user management event
   */
  async logUserChange(
    eventType:
      | "USER_CREATE"
      | "USER_UPDATE"
      | "USER_DELETE"
      | "USER_ROLE_CHANGE"
      | "USER_PERMISSION_CHANGE",
    actorId: string,
    targetUserId: string,
    action: string,
    context: {
      previousState?: Record<string, any>;
      newState?: Record<string, any>;
      ipAddress?: string;
      requestId?: string;
    }
  ): Promise<void> {
    await this.log({
      eventType,
      userId: actorId,
      resourceType: "user",
      resourceId: targetUserId,
      action,
      previousState: this.sanitizeState(context.previousState),
      newState: this.sanitizeState(context.newState),
      success: true,
      ipAddress: context.ipAddress,
      requestId: context.requestId,
    });
  }

  /**
   * Log task operation
   */
  async logTaskOperation(
    eventType:
      | "TASK_CREATE"
      | "TASK_UPDATE"
      | "TASK_DELETE"
      | "TASK_STATUS_CHANGE"
      | "TASK_ASSIGN",
    userId: string,
    taskId: string,
    action: string,
    context: {
      previousState?: Record<string, any>;
      newState?: Record<string, any>;
      requestId?: string;
    }
  ): Promise<void> {
    await this.log({
      eventType,
      userId,
      resourceType: "task",
      resourceId: taskId,
      action,
      previousState: context.previousState,
      newState: context.newState,
      success: true,
      requestId: context.requestId,
    });
  }

  /**
   * Log data operation (export/import/backup)
   */
  async logDataOperation(
    eventType: "DATA_EXPORT" | "DATA_IMPORT" | "DATA_BACKUP" | "DATA_RESTORE",
    userId: string,
    action: string,
    details: Record<string, any>,
    context: {
      ipAddress?: string;
      requestId?: string;
    }
  ): Promise<void> {
    await this.log({
      eventType,
      userId,
      resourceType: "data",
      action,
      details,
      success: true,
      ipAddress: context.ipAddress,
      requestId: context.requestId,
    });
  }

  /**
   * Log security alert
   */
  async logSecurityAlert(
    action: string,
    details: Record<string, any>,
    context: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      requestId?: string;
    }
  ): Promise<void> {
    await this.log({
      eventType: "SECURITY_ALERT",
      userId: context.userId,
      action,
      details,
      success: false,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      requestId: context.requestId,
    });
  }

  /**
   * Query audit logs with filters
   */
  async query(filters: {
    userId?: string;
    eventType?: AuditEventType;
    severity?: AuditSeverity;
    resourceType?: string;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
    success?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    logs: AuditLogEntry[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query: Record<string, any> = {};

    if (filters.userId) query.userId = filters.userId;
    if (filters.eventType) query.eventType = filters.eventType;
    if (filters.severity) query.severity = filters.severity;
    if (filters.resourceType) query.resourceType = filters.resourceType;
    if (filters.resourceId) query.resourceId = filters.resourceId;
    if (filters.success !== undefined) query.success = filters.success;

    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = filters.startDate;
      if (filters.endDate) query.timestamp.$lte = filters.endDate;
    }

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 100);
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return {
      logs: logs as AuditLogEntry[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get audit statistics
   */
  async getStatistics(days: number = 30): Promise<{
    totalEvents: number;
    byEventType: Record<string, number>;
    bySeverity: Record<string, number>;
    failedOperations: number;
    securityAlerts: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalEvents,
      eventTypeCounts,
      severityCounts,
      failedOperations,
      securityAlerts,
    ] = await Promise.all([
      AuditLog.countDocuments({ timestamp: { $gte: startDate } }),
      AuditLog.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        { $group: { _id: "$eventType", count: { $sum: 1 } } },
      ]),
      AuditLog.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        { $group: { _id: "$severity", count: { $sum: 1 } } },
      ]),
      AuditLog.countDocuments({
        timestamp: { $gte: startDate },
        success: false,
      }),
      AuditLog.countDocuments({
        timestamp: { $gte: startDate },
        eventType: "SECURITY_ALERT",
      }),
    ]);

    return {
      totalEvents,
      byEventType: eventTypeCounts.reduce(
        (acc, { _id, count }) => ({ ...acc, [_id]: count }),
        {}
      ),
      bySeverity: severityCounts.reduce(
        (acc, { _id, count }) => ({ ...acc, [_id]: count }),
        {}
      ),
      failedOperations,
      securityAlerts,
    };
  }

  /**
   * Remove sensitive fields from state objects
   */
  private sanitizeState(
    state?: Record<string, any>
  ): Record<string, any> | undefined {
    if (!state) return undefined;

    const sanitized = { ...state };
    const sensitiveFields = [
      "password",
      "token",
      "secret",
      "apiKey",
      "refreshToken",
    ];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = "[REDACTED]";
      }
    }

    return sanitized;
  }

  /**
   * Graceful shutdown - flush remaining logs
   */
  async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flush();
  }
}

// Export singleton instance
export const auditService = AuditService.getInstance();
export default auditService;

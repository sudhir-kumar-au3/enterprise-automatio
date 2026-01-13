import mongoose, { Schema, Document } from "mongoose";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "permission_change"
  | "bulk_operation"
  | "export"
  | "import"
  | "automation_triggered";

export type AuditResource =
  | "task"
  | "comment"
  | "team_member"
  | "automation_rule"
  | "time_entry"
  | "webhook"
  | "backup"
  | "settings"
  | "integration";

export interface IAuditLog {
  id: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  userId: string;
  userEmail: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
  previousValue?: Record<string, any>;
  newValue?: Record<string, any>;
  metadata?: Record<string, any>;
  timestamp: number;
}

export interface AuditLogDocument extends Omit<IAuditLog, "id">, Document {}

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    action: {
      type: String,
      enum: [
        "create",
        "update",
        "delete",
        "login",
        "logout",
        "permission_change",
        "bulk_operation",
        "export",
        "import",
        "automation_triggered",
      ],
      required: true,
    },
    resource: {
      type: String,
      enum: [
        "task",
        "comment",
        "team_member",
        "automation_rule",
        "time_entry",
        "webhook",
        "backup",
        "settings",
        "integration",
      ],
      required: true,
    },
    resourceId: {
      type: String,
      default: null,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    previousValue: {
      type: Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: Schema.Types.Mixed,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Number,
      default: () => Date.now(),
      index: true,
    },
  },
  {
    timestamps: false,
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

// Indexes for efficient querying
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });

// TTL index - auto-delete logs older than 90 days (configurable)
auditLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

const AuditLog = mongoose.model<AuditLogDocument>("AuditLog", auditLogSchema);

export default AuditLog;

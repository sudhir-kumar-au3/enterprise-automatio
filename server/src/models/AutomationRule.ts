import mongoose, { Schema, Document } from "mongoose";

export type AutomationTrigger =
  | "task_created"
  | "task_updated"
  | "task_status_changed"
  | "task_assigned"
  | "task_due_soon"
  | "task_overdue"
  | "comment_added"
  | "time_logged"
  | "schedule"; // For scheduled/recurring automations

export type AutomationAction =
  | "update_task_status"
  | "update_task_priority"
  | "assign_task"
  | "add_tag"
  | "remove_tag"
  | "send_notification"
  | "send_webhook"
  | "create_task"
  | "add_comment"
  | "send_email"
  | "update_field"
  | "move_to_context";

export interface AutomationCondition {
  field: string;
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "not_contains"
    | "greater_than"
    | "less_than"
    | "is_empty"
    | "is_not_empty";
  value: any;
}

export interface AutomationActionConfig {
  type: AutomationAction;
  config: Record<string, any>;
}

export interface IAutomationRule {
  id: string;
  name: string;
  description?: string;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationActionConfig[];
  isActive: boolean;
  createdBy: string;
  executionCount: number;
  lastExecutedAt?: number;
  schedule?: {
    cron: string; // Cron expression for scheduled triggers
    timezone: string;
  };
  createdAt: number;
  updatedAt: number;
}

export interface AutomationRuleDocument
  extends Omit<IAutomationRule, "id">,
    Document {}

const automationConditionSchema = new Schema(
  {
    field: { type: String, required: true },
    operator: {
      type: String,
      enum: [
        "equals",
        "not_equals",
        "contains",
        "not_contains",
        "greater_than",
        "less_than",
        "is_empty",
        "is_not_empty",
      ],
      required: true,
    },
    value: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const automationActionSchema = new Schema(
  {
    type: {
      type: String,
      enum: [
        "update_task_status",
        "update_task_priority",
        "assign_task",
        "add_tag",
        "remove_tag",
        "send_notification",
        "send_webhook",
        "create_task",
        "add_comment",
        "send_email",
        "update_field",
        "move_to_context",
      ],
      required: true,
    },
    config: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const automationRuleSchema = new Schema<AutomationRuleDocument>(
  {
    name: {
      type: String,
      required: [true, "Rule name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    trigger: {
      type: String,
      enum: [
        "task_created",
        "task_updated",
        "task_status_changed",
        "task_assigned",
        "task_due_soon",
        "task_overdue",
        "comment_added",
        "time_logged",
        "schedule",
      ],
      required: [true, "Trigger is required"],
    },
    conditions: [automationConditionSchema],
    actions: [automationActionSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: String,
      ref: "TeamMember",
      required: true,
    },
    executionCount: {
      type: Number,
      default: 0,
    },
    lastExecutedAt: {
      type: Number,
      default: null,
    },
    schedule: {
      cron: { type: String },
      timezone: { type: String, default: "UTC" },
    },
    createdAt: {
      type: Number,
      default: () => Date.now(),
    },
    updatedAt: {
      type: Number,
      default: () => Date.now(),
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

// Indexes
automationRuleSchema.index({ trigger: 1, isActive: 1 });
automationRuleSchema.index({ createdBy: 1 });

automationRuleSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const AutomationRule = mongoose.model<AutomationRuleDocument>(
  "AutomationRule",
  automationRuleSchema
);

export default AutomationRule;

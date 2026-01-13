import mongoose, { Schema, Document } from "mongoose";

export interface IRecurringTask {
  id: string;
  templateName: string;
  title: string;
  description?: string;
  status: "todo" | "in-progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "critical";
  assigneeId?: string;
  contextType?: "service" | "workflow" | "roadmap" | "general";
  contextId?: string;
  tags?: string[];
  // Recurrence settings
  recurrence: {
    frequency:
      | "daily"
      | "weekly"
      | "biweekly"
      | "monthly"
      | "quarterly"
      | "yearly"
      | "custom";
    interval: number; // Every X days/weeks/months
    daysOfWeek?: number[]; // 0-6 for weekly (0 = Sunday)
    dayOfMonth?: number; // 1-31 for monthly
    monthOfYear?: number; // 1-12 for yearly
    startDate: number;
    endDate?: number;
    timezone: string;
  };
  isActive: boolean;
  createdBy: string;
  lastCreatedAt?: number;
  nextCreationAt: number;
  totalCreated: number;
  createdAt: number;
  updatedAt: number;
}

export interface RecurringTaskDocument
  extends Omit<IRecurringTask, "id">,
    Document {}

const recurrenceSchema = new Schema(
  {
    frequency: {
      type: String,
      enum: [
        "daily",
        "weekly",
        "biweekly",
        "monthly",
        "quarterly",
        "yearly",
        "custom",
      ],
      required: true,
    },
    interval: { type: Number, default: 1, min: 1 },
    daysOfWeek: [{ type: Number, min: 0, max: 6 }],
    dayOfMonth: { type: Number, min: 1, max: 31 },
    monthOfYear: { type: Number, min: 1, max: 12 },
    startDate: { type: Number, required: true },
    endDate: { type: Number, default: null },
    timezone: { type: String, default: "UTC" },
  },
  { _id: false }
);

const recurringTaskSchema = new Schema<RecurringTaskDocument>(
  {
    templateName: {
      type: String,
      required: [true, "Template name is required"],
      trim: true,
      maxlength: [100, "Template name cannot exceed 100 characters"],
    },
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [5000, "Description cannot exceed 5000 characters"],
      default: "",
    },
    status: {
      type: String,
      enum: ["todo", "in-progress", "review", "done"],
      default: "todo",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    assigneeId: {
      type: String,
      ref: "TeamMember",
      default: null,
    },
    contextType: {
      type: String,
      enum: ["service", "workflow", "roadmap", "general"],
      default: "general",
    },
    contextId: {
      type: String,
      default: null,
    },
    tags: [{ type: String, trim: true }],
    recurrence: {
      type: recurrenceSchema,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: String,
      ref: "TeamMember",
      required: true,
    },
    lastCreatedAt: {
      type: Number,
      default: null,
    },
    nextCreationAt: {
      type: Number,
      required: true,
      index: true,
    },
    totalCreated: {
      type: Number,
      default: 0,
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

recurringTaskSchema.index({ isActive: 1, nextCreationAt: 1 });
recurringTaskSchema.index({ createdBy: 1 });

recurringTaskSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const RecurringTask = mongoose.model<RecurringTaskDocument>(
  "RecurringTask",
  recurringTaskSchema
);

export default RecurringTask;

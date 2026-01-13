import mongoose, { Schema, Document } from "mongoose";

export interface ITaskTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  title: string;
  taskDescription?: string;
  status: "todo" | "in-progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "critical";
  contextType?: "service" | "workflow" | "roadmap" | "general";
  tags?: string[];
  estimatedHours?: number;
  checklist?: Array<{ text: string; required: boolean }>;
  subtasks?: Array<{
    title: string;
    description?: string;
    priority: "low" | "medium" | "high" | "critical";
  }>;
  autoAssign?: {
    type: "specific" | "round_robin" | "least_loaded" | "skill_based";
    assigneeId?: string;
    skillTags?: string[];
  };
  isPublic: boolean;
  usageCount: number;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface TaskTemplateDocument
  extends Omit<ITaskTemplate, "id">,
    Document {}

const checklistItemSchema = new Schema(
  {
    text: { type: String, required: true },
    required: { type: Boolean, default: false },
  },
  { _id: false }
);

const subtaskSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
  },
  { _id: false }
);

const autoAssignSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["specific", "round_robin", "least_loaded", "skill_based"],
      required: true,
    },
    assigneeId: { type: String, default: null },
    skillTags: [{ type: String }],
  },
  { _id: false }
);

const taskTemplateSchema = new Schema<TaskTemplateDocument>(
  {
    name: {
      type: String,
      required: [true, "Template name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Task title template is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    taskDescription: {
      type: String,
      trim: true,
      maxlength: [5000, "Task description cannot exceed 5000 characters"],
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
    contextType: {
      type: String,
      enum: ["service", "workflow", "roadmap", "general"],
      default: "general",
    },
    tags: [{ type: String, trim: true }],
    estimatedHours: {
      type: Number,
      default: null,
    },
    checklist: [checklistItemSchema],
    subtasks: [subtaskSchema],
    autoAssign: autoAssignSchema,
    isPublic: {
      type: Boolean,
      default: true,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: String,
      ref: "TeamMember",
      required: true,
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

taskTemplateSchema.index({ category: 1, isPublic: 1 });
taskTemplateSchema.index({ createdBy: 1 });
taskTemplateSchema.index({ name: "text", description: "text" });

taskTemplateSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const TaskTemplate = mongoose.model<TaskTemplateDocument>(
  "TaskTemplate",
  taskTemplateSchema
);

export default TaskTemplate;

import mongoose, { Schema, Document } from "mongoose";
import { ITask, TaskStatus, TaskPriority, ContextType } from "../types";

export interface TaskDocument extends Omit<ITask, "id">, Document {}

const taskSchema = new Schema<TaskDocument>(
  {
    // Organization reference for multi-tenancy
    organizationId: {
      type: String,
      ref: "Organization",
      required: [true, "Organization ID is required"],
      index: true,
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
    creatorId: {
      type: String,
      ref: "TeamMember",
      required: [true, "Creator ID is required"],
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
    dueDate: {
      type: Number,
      default: null,
    },
    createdAt: {
      type: Number,
      default: () => Date.now(),
    },
    updatedAt: {
      type: Number,
      default: () => Date.now(),
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    comments: [
      {
        type: String,
        ref: "Comment",
      },
    ],
    dependencies: [
      {
        type: String,
        ref: "Task",
      },
    ],
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

// Indexes for faster queries
taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ assigneeId: 1 });
taskSchema.index({ creatorId: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ createdAt: -1 });
taskSchema.index({ tags: 1 });
taskSchema.index({ contextType: 1, contextId: 1 });

// Text index for search
taskSchema.index({ title: "text", description: "text" });

// Compound indexes for multi-tenant queries
taskSchema.index({ organizationId: 1, status: 1 });
taskSchema.index({ organizationId: 1, assigneeId: 1 });
taskSchema.index({ organizationId: 1, createdAt: -1 });

// Update updatedAt before saving
taskSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Update updatedAt before updating
taskSchema.pre(["updateOne", "findOneAndUpdate"], function (next) {
  this.set({ updatedAt: Date.now() });
  next();
});

const Task = mongoose.model<TaskDocument>("Task", taskSchema);

export default Task;

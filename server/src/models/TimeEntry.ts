import mongoose, { Schema, Document } from "mongoose";

export interface ITimeEntry {
  id: string;
  organizationId: string; // Added for multi-tenancy
  taskId: string;
  userId: string;
  description?: string;
  startTime: number;
  endTime?: number;
  duration: number; // in seconds
  isBillable: boolean;
  hourlyRate?: number;
  tags?: string[];
  isRunning: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface TimeEntryDocument extends Omit<ITimeEntry, "id">, Document {}

const timeEntrySchema = new Schema<TimeEntryDocument>(
  {
    organizationId: {
      type: String,
      required: [true, "Organization ID is required"],
      index: true,
    },
    taskId: {
      type: String,
      ref: "Task",
      required: [true, "Task ID is required"],
      index: true,
    },
    userId: {
      type: String,
      ref: "TeamMember",
      required: [true, "User ID is required"],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    startTime: {
      type: Number,
      required: [true, "Start time is required"],
    },
    endTime: {
      type: Number,
      default: null,
    },
    duration: {
      type: Number,
      default: 0,
    },
    isBillable: {
      type: Boolean,
      default: false,
    },
    hourlyRate: {
      type: Number,
      default: null,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    isRunning: {
      type: Boolean,
      default: false,
      index: true,
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
timeEntrySchema.index({ organizationId: 1, taskId: 1, userId: 1 });
timeEntrySchema.index({ organizationId: 1, startTime: -1 });
timeEntrySchema.index({ organizationId: 1, userId: 1, startTime: -1 });
timeEntrySchema.index({ organizationId: 1, userId: 1, isRunning: 1 });
timeEntrySchema.index({ taskId: 1, userId: 1 });
timeEntrySchema.index({ startTime: -1 });
timeEntrySchema.index({ userId: 1, startTime: -1 });

// Calculate duration before saving
timeEntrySchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  if (this.endTime && this.startTime) {
    this.duration = Math.floor((this.endTime - this.startTime) / 1000);
  }
  next();
});

const TimeEntry = mongoose.model<TimeEntryDocument>(
  "TimeEntry",
  timeEntrySchema
);

export default TimeEntry;

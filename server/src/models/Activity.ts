import mongoose, { Schema, Document } from "mongoose";
import { IActivity, ActivityType } from "../types";

export interface ActivityDocument extends Omit<IActivity, "id">, Document {}

const activitySchema = new Schema<ActivityDocument>(
  {
    userId: {
      type: String,
      required: [true, "User ID is required"],
      ref: "TeamMember",
    },
    type: {
      type: String,
      enum: [
        "comment",
        "task-created",
        "task-updated",
        "task-assigned",
        "mention",
        "task-completed",
        "status-changed",
      ],
      required: [true, "Activity type is required"],
    },
    timestamp: {
      type: Number,
      default: () => Date.now(),
    },
    contextType: {
      type: String,
      required: true,
    },
    contextId: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: [true, "Activity content is required"],
      maxlength: [1000, "Content cannot exceed 1000 characters"],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
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
activitySchema.index({ userId: 1 });
activitySchema.index({ type: 1 });
activitySchema.index({ timestamp: -1 });
activitySchema.index({ contextType: 1, contextId: 1 });

// TTL index to automatically delete old activities after 90 days
activitySchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

const Activity = mongoose.model<ActivityDocument>("Activity", activitySchema);

export default Activity;

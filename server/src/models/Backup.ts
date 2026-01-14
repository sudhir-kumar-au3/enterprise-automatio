import mongoose, { Schema, Document } from "mongoose";
import { IBackup } from "../types";

export interface BackupDocument extends Omit<IBackup, "id">, Document {}

const backupSchema = new Schema<BackupDocument>(
  {
    organizationId: {
      type: String,
      required: [true, "Organization ID is required"],
      index: true,
    },
    timestamp: {
      type: Number,
      default: () => Date.now(),
    },
    data: {
      type: String,
      required: [true, "Backup data is required"],
    },
    userId: {
      type: String,
      required: [true, "User ID is required"],
      ref: "TeamMember",
    },
    type: {
      type: String,
      enum: ["manual", "automatic"],
      default: "manual",
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

// Indexes
backupSchema.index({ organizationId: 1, userId: 1 });
backupSchema.index({ organizationId: 1, timestamp: -1 });
backupSchema.index({ organizationId: 1, type: 1 });
backupSchema.index({ userId: 1 });
backupSchema.index({ timestamp: -1 });
backupSchema.index({ type: 1 });

// Keep only 10 most recent backups per user
backupSchema.index({ userId: 1, timestamp: -1 });

const Backup = mongoose.model<BackupDocument>("Backup", backupSchema);

export default Backup;

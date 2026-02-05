import mongoose, { Document, Schema } from "mongoose";

export type MeetingType =
  | "team-review"
  | "sprint-planning"
  | "standup"
  | "one-on-one"
  | "retrospective"
  | "custom";

export type MeetingStatus =
  | "scheduled"
  | "in-progress"
  | "completed"
  | "cancelled";

export type RecurrencePattern =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "none";

export interface MeetingDocument extends Document {
  organizationId: string;
  title: string;
  description?: string;
  meetingType: MeetingType;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  location?: string;
  meetingLink?: string; // External meeting link (Teams, Google Meet, etc.)
  platform?: "google" | "teams" | "zoom" | "other";
  status: MeetingStatus;

  // Attendees
  organizerId: string;
  attendeeIds: string[];

  // Recurrence
  isRecurring: boolean;
  recurrencePattern: RecurrencePattern;
  recurrenceEndDate?: Date;
  parentMeetingId?: string; // For recurring meeting instances

  // Task linking
  linkedTaskIds: string[];

  // Reminders
  reminderMinutes: number[]; // e.g., [15, 60] for 15 min and 1 hour before

  // Metadata
  color?: string;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const meetingSchema = new Schema<MeetingDocument>(
  {
    organizationId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    meetingType: {
      type: String,
      enum: [
        "team-review",
        "sprint-planning",
        "standup",
        "one-on-one",
        "retrospective",
        "custom",
      ],
      default: "custom",
    },
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 5,
      max: 480, // 8 hours max
    },
    location: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    meetingLink: {
      type: String,
      trim: true,
    },
    platform: {
      type: String,
      enum: ["google", "teams", "zoom", "other"],
    },
    status: {
      type: String,
      enum: ["scheduled", "in-progress", "completed", "cancelled"],
      default: "scheduled",
    },
    organizerId: {
      type: String,
      required: true,
      ref: "TeamMember",
    },
    attendeeIds: [
      {
        type: String,
        ref: "TeamMember",
      },
    ],
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurrencePattern: {
      type: String,
      enum: ["daily", "weekly", "biweekly", "monthly", "none"],
      default: "none",
    },
    recurrenceEndDate: {
      type: Date,
    },
    parentMeetingId: {
      type: String,
      ref: "Meeting",
    },
    linkedTaskIds: [
      {
        type: String,
        ref: "Task",
      },
    ],
    reminderMinutes: {
      type: [Number],
      default: [15],
    },
    color: {
      type: String,
      default: "#3b82f6", // Default blue
    },
    notes: {
      type: String,
      maxlength: 5000,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
meetingSchema.index({ organizationId: 1, startTime: 1 });
meetingSchema.index({ organizationId: 1, attendeeIds: 1 });
meetingSchema.index({ organizationId: 1, organizerId: 1 });
meetingSchema.index({ organizationId: 1, status: 1 });
meetingSchema.index({ parentMeetingId: 1 });

// Virtual for checking if meeting is upcoming
meetingSchema.virtual("isUpcoming").get(function () {
  return this.startTime > new Date() && this.status === "scheduled";
});

// Virtual for checking if meeting is happening now
meetingSchema.virtual("isHappeningNow").get(function () {
  const now = new Date();
  return (
    this.startTime <= now && this.endTime >= now && this.status !== "cancelled"
  );
});

export default mongoose.model<MeetingDocument>("Meeting", meetingSchema);

import mongoose, { Schema, Document } from "mongoose";

export interface IWebhook {
  id: string;
  name: string;
  url: string;
  secret?: string;
  events: string[];
  isActive: boolean;
  createdBy: string;
  headers?: Record<string, string>;
  retryCount: number;
  lastTriggeredAt?: number;
  lastStatus?: number;
  failureCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface WebhookDocument extends Omit<IWebhook, "id">, Document {}

const webhookSchema = new Schema<WebhookDocument>(
  {
    name: {
      type: String,
      required: [true, "Webhook name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    url: {
      type: String,
      required: [true, "Webhook URL is required"],
      trim: true,
    },
    secret: {
      type: String,
      default: null,
    },
    events: [
      {
        type: String,
        enum: [
          "task.created",
          "task.updated",
          "task.deleted",
          "task.status_changed",
          "comment.created",
          "comment.deleted",
          "team_member.created",
          "team_member.updated",
          "team_member.deleted",
          "time_entry.created",
          "time_entry.stopped",
          "automation.triggered",
        ],
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: String,
      ref: "TeamMember",
      required: true,
    },
    headers: {
      type: Map,
      of: String,
      default: {},
    },
    retryCount: {
      type: Number,
      default: 3,
    },
    lastTriggeredAt: {
      type: Number,
      default: null,
    },
    lastStatus: {
      type: Number,
      default: null,
    },
    failureCount: {
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
        // Don't expose secret in responses
        delete ret.secret;
        return ret;
      },
    },
  }
);

webhookSchema.index({ events: 1, isActive: 1 });
webhookSchema.index({ createdBy: 1 });

webhookSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Webhook = mongoose.model<WebhookDocument>("Webhook", webhookSchema);

export default Webhook;

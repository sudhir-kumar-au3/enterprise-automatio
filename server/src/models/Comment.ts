import mongoose, { Schema, Document } from "mongoose";
import { IComment, ContextType, IReaction } from "../types";

export interface CommentDocument
  extends Omit<IComment, "id" | "replies">,
    Document {
  replies: mongoose.Types.ObjectId[];
}

const reactionSchema = new Schema<IReaction>(
  {
    emoji: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
      ref: "TeamMember",
    },
  },
  { _id: false }
);

const commentSchema = new Schema<CommentDocument>(
  {
    organizationId: {
      type: String,
      required: [true, "Organization ID is required"],
      index: true,
    },
    authorId: {
      type: String,
      required: [true, "Author ID is required"],
      ref: "TeamMember",
    },
    content: {
      type: String,
      required: [true, "Comment content is required"],
      trim: true,
      maxlength: [5000, "Comment cannot exceed 5000 characters"],
    },
    timestamp: {
      type: Number,
      default: () => Date.now(),
    },
    contextType: {
      type: String,
      enum: ["service", "workflow", "roadmap", "general"],
      default: "general",
    },
    contextId: {
      type: String,
      default: "general",
    },
    replies: [
      {
        type: Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    reactions: [reactionSchema],
    mentions: [
      {
        type: String,
        ref: "TeamMember",
      },
    ],
    isResolved: {
      type: Boolean,
      default: false,
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
commentSchema.index({ organizationId: 1, authorId: 1 });
commentSchema.index({ organizationId: 1, contextType: 1, contextId: 1 });
commentSchema.index({ organizationId: 1, timestamp: -1 });
commentSchema.index({ organizationId: 1, isResolved: 1 });

// Text index for search
commentSchema.index({ content: "text" });

const Comment = mongoose.model<CommentDocument>("Comment", commentSchema);

export default Comment;

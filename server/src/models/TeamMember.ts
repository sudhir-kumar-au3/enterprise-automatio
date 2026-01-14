import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { ITeamMember, AccessLevel, TeamRole, Permission } from "../types";

export interface TeamMemberDocument extends Omit<ITeamMember, "id">, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
  createPasswordResetToken(): string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
}

const teamMemberSchema = new Schema<TeamMemberDocument>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    role: {
      type: String,
      enum: ["architect", "developer", "devops", "product"],
      default: "developer",
    },
    accessLevel: {
      type: String,
      enum: ["owner", "admin", "member", "viewer"],
      default: "member",
    },
    customPermissions: [
      {
        type: String,
        enum: [
          "manage_team",
          "manage_roles",
          "manage_permissions",
          "create_tasks",
          "assign_tasks",
          "delete_tasks",
          "edit_all_tasks",
          "create_comments",
          "delete_comments",
          "manage_services",
          "manage_workflows",
          "manage_roadmap",
          "view_analytics",
          "export_data",
        ],
      },
    ],
    avatarUrl: {
      type: String,
      default: function (this: TeamMemberDocument) {
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${this.name}`;
      },
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
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
        delete ret.password;
        return ret;
      },
    },
  }
);

// Index for faster queries
teamMemberSchema.index({ email: 1 });
teamMemberSchema.index({ role: 1 });
teamMemberSchema.index({ accessLevel: 1 });
teamMemberSchema.index({ isOnline: 1 });

// Hash password before saving
teamMemberSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password!, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
teamMemberSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Create password reset token
teamMemberSchema.methods.createPasswordResetToken = function (): string {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Token expires in 10 minutes
  this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);

  return resetToken;
};

const TeamMember = mongoose.model<TeamMemberDocument>(
  "TeamMember",
  teamMemberSchema
);

export default TeamMember;

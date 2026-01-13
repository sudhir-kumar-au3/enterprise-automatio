/**
 * Seed script to create an owner user
 *
 * Usage: npx ts-node scripts/seed-owner.ts
 *
 * Or add to package.json scripts:
 * "seed:owner": "ts-node scripts/seed-owner.ts"
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI =
  process.env.MONGO_URL || "mongodb://localhost:27017/enterprise-automation";

// Owner user configuration - CHANGE THESE VALUES
const OWNER_CONFIG = {
  name: "Admin Owner",
  email: "sudhir.kumar@onesaz.com",
  password: "1234567", // Change this to a secure password
  role: "architect" as const,
  accessLevel: "owner" as const,
};

// TeamMember schema (simplified for seeding)
const teamMemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
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
    customPermissions: [String],
    avatarUrl: String,
    isOnline: { type: Boolean, default: false },
    lastSeen: Date,
  },
  { timestamps: true }
);

const TeamMember = mongoose.model("TeamMember", teamMemberSchema);

async function seedOwner() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Check if owner already exists
    const existingOwner = await TeamMember.findOne({
      email: OWNER_CONFIG.email,
    });
    if (existingOwner) {
      console.log(`⚠️  User with email ${OWNER_CONFIG.email} already exists`);
      console.log("   To create a new owner, use a different email");
      process.exit(0);
    }

    // Check if any owner exists
    const existingOwnerRole = await TeamMember.findOne({
      accessLevel: "owner",
    });
    if (existingOwnerRole) {
      console.log(
        `ℹ️  An owner user already exists: ${existingOwnerRole.email}`
      );
      console.log("   Creating additional owner...");
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(OWNER_CONFIG.password, salt);

    // Create owner user
    const owner = await TeamMember.create({
      name: OWNER_CONFIG.name,
      email: OWNER_CONFIG.email,
      password: hashedPassword,
      role: OWNER_CONFIG.role,
      accessLevel: OWNER_CONFIG.accessLevel,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${OWNER_CONFIG.name.replace(
        /\s/g,
        ""
      )}`,
      isOnline: false,
    });

    console.log("\n✅ Owner user created successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   Name:         ${owner.name}`);
    console.log(`   Email:        ${owner.email}`);
    console.log(`   Role:         ${owner.role}`);
    console.log(`   Access Level: ${owner.accessLevel}`);
    console.log(`   Password:     ${OWNER_CONFIG.password}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n⚠️  Remember to change the password after first login!\n");
  } catch (error) {
    console.error("❌ Error seeding owner:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

seedOwner();

/**
 * Migration Script: Add organizationId to existing data
 *
 * This script creates a default organization and assigns all existing
 * team members and tasks to it for multi-tenancy migration.
 *
 * Usage: npx ts-node scripts/migrate-to-multi-tenant.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const MONGODB_URI =
  process.env.MONGO_URL || "mongodb://localhost:27017/enterprise-automation";

// Organization schema (simplified for migration)
const organizationSchema = new mongoose.Schema(
  {
    name: String,
    slug: { type: String, unique: true },
    branding: {
      companyName: String,
      primaryColor: { type: String, default: "#3b82f6" },
      accentColor: { type: String, default: "#8b5cf6" },
    },
    subscription: {
      plan: { type: String, default: "professional" },
      status: { type: String, default: "active" },
    },
    limits: {
      maxUsers: { type: Number, default: -1 },
      maxTasks: { type: Number, default: -1 },
      maxStorage: { type: Number, default: -1 },
      maxApiCalls: { type: Number, default: -1 },
      features: [String],
    },
    settings: {
      defaultTimezone: { type: String, default: "UTC" },
      defaultLanguage: { type: String, default: "en" },
      dateFormat: { type: String, default: "MM/DD/YYYY" },
      allowPublicSignup: { type: Boolean, default: true },
      requireEmailVerification: { type: Boolean, default: false },
      ssoEnabled: { type: Boolean, default: false },
    },
    ownerId: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Organization = mongoose.model("Organization", organizationSchema);

// Default organization configuration
const DEFAULT_ORG_CONFIG = {
  name: "Default Organization",
  slug: "default",
  branding: {
    companyName: "Pulsework",
    primaryColor: "#3b82f6",
    accentColor: "#8b5cf6",
  },
  subscription: {
    plan: "professional",
    status: "active",
  },
  limits: {
    maxUsers: -1, // Unlimited
    maxTasks: -1,
    maxStorage: -1,
    maxApiCalls: -1,
    features: [
      "basic_tasks",
      "comments",
      "team_view",
      "analytics",
      "calendar",
      "export",
      "api_access",
      "custom_branding",
      "priority_support",
    ],
  },
  settings: {
    defaultTimezone: "UTC",
    defaultLanguage: "en",
    dateFormat: "MM/DD/YYYY",
    allowPublicSignup: true,
    requireEmailVerification: false,
    ssoEnabled: false,
  },
  isActive: true,
};

async function migrateToMultiTenant() {
  console.log("\n🚀 Starting Multi-Tenant Migration\n");
  console.log("━".repeat(50));

  try {
    // Connect to MongoDB
    console.log("\n📡 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not established");
    }

    // Step 1: Check if organization already exists
    console.log("\n📋 Step 1: Checking for existing organizations...");
    let organization = await Organization.findOne({
      slug: DEFAULT_ORG_CONFIG.slug,
    });

    if (organization) {
      console.log(
        `✅ Default organization already exists: ${organization._id}`
      );
    } else {
      // Create default organization
      console.log("📝 Creating default organization...");

      // Find the first owner/admin user to set as organization owner
      const teamMembersCollection = db.collection("teammembers");
      const ownerUser = await teamMembersCollection.findOne({
        accessLevel: { $in: ["owner", "admin"] },
      });

      organization = await Organization.create({
        ...DEFAULT_ORG_CONFIG,
        ownerId: ownerUser?._id?.toString() || "system",
      });

      console.log(`✅ Created default organization: ${organization._id}`);
    }

    const organizationId = organization._id.toString();

    // Step 2: Update TeamMembers
    console.log("\n📋 Step 2: Migrating TeamMembers...");
    const teamMembersCollection = db.collection("teammembers");

    // Count members without organizationId
    const membersToUpdate = await teamMembersCollection.countDocuments({
      $or: [
        { organizationId: { $exists: false } },
        { organizationId: null },
        { organizationId: "" },
      ],
    });

    console.log(`   Found ${membersToUpdate} team members to migrate`);

    if (membersToUpdate > 0) {
      const memberResult = await teamMembersCollection.updateMany(
        {
          $or: [
            { organizationId: { $exists: false } },
            { organizationId: null },
            { organizationId: "" },
          ],
        },
        { $set: { organizationId } }
      );
      console.log(`✅ Updated ${memberResult.modifiedCount} team members`);
    } else {
      console.log("✅ All team members already have organizationId");
    }

    // Step 3: Update Tasks
    console.log("\n📋 Step 3: Migrating Tasks...");
    const tasksCollection = db.collection("tasks");

    const tasksToUpdate = await tasksCollection.countDocuments({
      $or: [
        { organizationId: { $exists: false } },
        { organizationId: null },
        { organizationId: "" },
      ],
    });

    console.log(`   Found ${tasksToUpdate} tasks to migrate`);

    if (tasksToUpdate > 0) {
      const taskResult = await tasksCollection.updateMany(
        {
          $or: [
            { organizationId: { $exists: false } },
            { organizationId: null },
            { organizationId: "" },
          ],
        },
        { $set: { organizationId } }
      );
      console.log(`✅ Updated ${taskResult.modifiedCount} tasks`);
    } else {
      console.log("✅ All tasks already have organizationId");
    }

    // Step 4: Update Comments
    console.log("\n📋 Step 4: Migrating Comments...");
    const commentsCollection = db.collection("comments");

    const commentsToUpdate = await commentsCollection.countDocuments({
      $or: [
        { organizationId: { $exists: false } },
        { organizationId: null },
        { organizationId: "" },
      ],
    });

    console.log(`   Found ${commentsToUpdate} comments to migrate`);

    if (commentsToUpdate > 0) {
      const commentResult = await commentsCollection.updateMany(
        {
          $or: [
            { organizationId: { $exists: false } },
            { organizationId: null },
            { organizationId: "" },
          ],
        },
        { $set: { organizationId } }
      );
      console.log(`✅ Updated ${commentResult.modifiedCount} comments`);
    } else {
      console.log("✅ All comments already have organizationId");
    }

    // Step 5: Update Activities
    console.log("\n📋 Step 5: Migrating Activities...");
    const activitiesCollection = db.collection("activities");

    const activitiesToUpdate = await activitiesCollection.countDocuments({
      $or: [
        { organizationId: { $exists: false } },
        { organizationId: null },
        { organizationId: "" },
      ],
    });

    console.log(`   Found ${activitiesToUpdate} activities to migrate`);

    if (activitiesToUpdate > 0) {
      const activityResult = await activitiesCollection.updateMany(
        {
          $or: [
            { organizationId: { $exists: false } },
            { organizationId: null },
            { organizationId: "" },
          ],
        },
        { $set: { organizationId } }
      );
      console.log(`✅ Updated ${activityResult.modifiedCount} activities`);
    } else {
      console.log("✅ All activities already have organizationId");
    }

    // Step 6: Create indexes
    console.log("\n📋 Step 6: Creating indexes...");

    // TeamMembers indexes
    await teamMembersCollection.createIndex({ organizationId: 1 });
    await teamMembersCollection.createIndex(
      { organizationId: 1, email: 1 },
      { unique: true }
    );
    console.log("   ✅ TeamMembers indexes created");

    // Tasks indexes
    await tasksCollection.createIndex({ organizationId: 1 });
    await tasksCollection.createIndex({ organizationId: 1, status: 1 });
    await tasksCollection.createIndex({ organizationId: 1, assigneeId: 1 });
    await tasksCollection.createIndex({ organizationId: 1, createdAt: -1 });
    console.log("   ✅ Tasks indexes created");

    // Comments indexes
    await commentsCollection.createIndex({ organizationId: 1 });
    console.log("   ✅ Comments indexes created");

    // Activities indexes
    await activitiesCollection.createIndex({ organizationId: 1 });
    console.log("   ✅ Activities indexes created");

    // Step 7: Update organization owner reference
    console.log("\n📋 Step 7: Updating organization owner...");
    const ownerUser = await teamMembersCollection.findOne({
      organizationId,
      accessLevel: "owner",
    });

    if (ownerUser) {
      await Organization.findByIdAndUpdate(organization._id, {
        ownerId: ownerUser._id.toString(),
      });
      console.log(
        `✅ Set organization owner to: ${ownerUser.name || ownerUser.email}`
      );
    }

    // Summary
    console.log("\n" + "━".repeat(50));
    console.log("\n✅ Migration Complete!\n");
    console.log("Summary:");
    console.log(`   Organization ID: ${organizationId}`);
    console.log(`   Organization Slug: ${DEFAULT_ORG_CONFIG.slug}`);

    const finalCounts = {
      members: await teamMembersCollection.countDocuments({ organizationId }),
      tasks: await tasksCollection.countDocuments({ organizationId }),
      comments: await commentsCollection.countDocuments({ organizationId }),
      activities: await activitiesCollection.countDocuments({ organizationId }),
    };

    console.log(`   Team Members: ${finalCounts.members}`);
    console.log(`   Tasks: ${finalCounts.tasks}`);
    console.log(`   Comments: ${finalCounts.comments}`);
    console.log(`   Activities: ${finalCounts.activities}`);
    console.log("\n" + "━".repeat(50) + "\n");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("📡 Disconnected from MongoDB\n");
  }
}

// Run migration
migrateToMultiTenant();

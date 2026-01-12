import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { TeamMember, Task, Comment, Activity } from "../models";

const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/team_hub";

// Sample team members data (matching frontend mock data)
const teamMembersData = [
  {
    name: "Sarah Chen",
    email: "sarah.chen@example.com",
    password: "password123",
    role: "architect" as const,
    accessLevel: "owner" as const,
    isOnline: true,
  },
  {
    name: "Michael Torres",
    email: "michael.torres@example.com",
    password: "password123",
    role: "developer" as const,
    accessLevel: "admin" as const,
    isOnline: true,
  },
  {
    name: "Priya Patel",
    email: "priya.patel@example.com",
    password: "password123",
    role: "devops" as const,
    accessLevel: "member" as const,
    isOnline: false,
  },
  {
    name: "James Wilson",
    email: "james.wilson@example.com",
    password: "password123",
    role: "product" as const,
    accessLevel: "viewer" as const,
    isOnline: true,
  },
  {
    name: "Elena Rodriguez",
    email: "elena.rodriguez@example.com",
    password: "password123",
    role: "developer" as const,
    accessLevel: "member" as const,
    isOnline: true,
  },
];

// Sample tasks data
const getTasksData = (memberIds: string[]) => [
  {
    title: "Set up CI/CD pipeline",
    description:
      "Configure GitHub Actions for automated testing and deployment",
    status: "in-progress" as const,
    priority: "high" as const,
    assigneeId: memberIds[2], // Priya (devops)
    creatorId: memberIds[0], // Sarah
    contextType: "workflow" as const,
    tags: ["devops", "automation"],
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
  },
  {
    title: "Implement user authentication",
    description: "Add JWT-based authentication with refresh tokens",
    status: "review" as const,
    priority: "critical" as const,
    assigneeId: memberIds[1], // Michael
    creatorId: memberIds[0],
    contextType: "service" as const,
    dueDate: Date.now() + 2 * 24 * 60 * 60 * 1000,
    tags: ["security", "backend"],
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now(),
  },
  {
    title: "Design system documentation",
    description: "Document all UI components and design tokens",
    status: "todo" as const,
    priority: "medium" as const,
    assigneeId: memberIds[4], // Elena
    creatorId: memberIds[3], // James
    contextType: "general" as const,
    dueDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
    tags: ["documentation", "design"],
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
  },
  {
    title: "API rate limiting",
    description: "Implement rate limiting for all API endpoints",
    status: "done" as const,
    priority: "high" as const,
    assigneeId: memberIds[1],
    creatorId: memberIds[0],
    contextType: "service" as const,
    tags: ["security", "api"],
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
  },
  {
    title: "Database optimization",
    description: "Add indexes and optimize slow queries",
    status: "todo" as const,
    priority: "medium" as const,
    creatorId: memberIds[0],
    contextType: "service" as const,
    tags: ["database", "performance"],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

// Sample comments data
const getCommentsData = (memberIds: string[]) => [
  {
    authorId: memberIds[0],
    content:
      "Great progress on the authentication system! Let's schedule a code review.",
    contextType: "general" as const,
    contextId: "general",
    timestamp: Date.now() - 2 * 60 * 60 * 1000,
    isResolved: false,
    reactions: [],
    mentions: [memberIds[1]],
  },
  {
    authorId: memberIds[1],
    content:
      "The CI/CD pipeline is almost ready. Just need to add the deployment step.",
    contextType: "workflow" as const,
    contextId: "workflow-1",
    timestamp: Date.now() - 5 * 60 * 60 * 1000,
    isResolved: false,
    reactions: [{ emoji: "👍", userId: memberIds[0] }],
    mentions: [],
  },
  {
    authorId: memberIds[3],
    content: "Can we discuss the roadmap priorities in our next standup?",
    contextType: "roadmap" as const,
    contextId: "roadmap-1",
    timestamp: Date.now() - 24 * 60 * 60 * 1000,
    isResolved: true,
    reactions: [],
    mentions: [],
  },
];

async function seed() {
  try {
    console.log("🌱 Starting database seed...");

    await mongoose.connect(MONGO_URL);
    console.log("✅ Connected to MongoDB");

    // Clear existing data
    await Promise.all([
      TeamMember.deleteMany({}),
      Task.deleteMany({}),
      Comment.deleteMany({}),
      Activity.deleteMany({}),
    ]);
    console.log("🗑️  Cleared existing data");

    // Create team members
    const createdMembers = await TeamMember.create(
      teamMembersData.map((member) => ({
        ...member,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`,
      }))
    );
    const memberIds = createdMembers.map((m) => m._id.toString());
    console.log(`👥 Created ${createdMembers.length} team members`);

    // Create tasks
    const tasksData = getTasksData(memberIds);
    const createdTasks = await Task.create(tasksData);
    console.log(`📋 Created ${createdTasks.length} tasks`);

    // Create comments
    const commentsData = getCommentsData(memberIds);
    const createdComments = await Comment.create(commentsData);
    console.log(`💬 Created ${createdComments.length} comments`);

    // Create some activity logs
    const activities = [
      {
        userId: memberIds[0],
        type: "task-created",
        timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
        contextType: "task",
        contextId: createdTasks[0]._id.toString(),
        content: `Created task: ${createdTasks[0].title}`,
      },
      {
        userId: memberIds[1],
        type: "status-changed",
        timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000,
        contextType: "task",
        contextId: createdTasks[1]._id.toString(),
        content: "Changed status from in-progress to review",
      },
    ];
    await Activity.create(activities);
    console.log(`📝 Created ${activities.length} activity logs`);

    console.log("\n✨ Database seeded successfully!\n");
    console.log("Test credentials:");
    console.log("  Email: sarah.chen@example.com");
    console.log("  Password: password123");
    console.log("\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seed();

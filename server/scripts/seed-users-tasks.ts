import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Import models
import Organization from "../src/models/Organization";
import TeamMember from "../src/models/TeamMember";
import Task from "../src/models/Task";

// Configuration
const TOTAL_USERS = 5000;
const TOTAL_TASKS = 10000;
const BATCH_SIZE = 500;

// Role distribution (percentages)
const ROLE_DISTRIBUTION = {
  developer: 0.5, // 50% developers
  architect: 0.15, // 15% architects
  devops: 0.2, // 20% devops
  product: 0.15, // 15% product managers
};

// Access level distribution
const ACCESS_LEVEL_DISTRIBUTION = {
  owner: 0.02, // 2% owners
  admin: 0.08, // 8% admins
  member: 0.7, // 70% members
  viewer: 0.2, // 20% viewers
};

// Task assignment weights by role
const TASK_ASSIGNMENT_WEIGHTS = {
  developer: 0.5, // 50% of tasks go to developers
  architect: 0.2, // 20% to architects
  devops: 0.2, // 20% to devops
  product: 0.1, // 10% to product managers
};

// Random data generators
const firstNames = [
  "James",
  "Mary",
  "John",
  "Patricia",
  "Robert",
  "Jennifer",
  "Michael",
  "Linda",
  "William",
  "Elizabeth",
  "David",
  "Barbara",
  "Richard",
  "Susan",
  "Joseph",
  "Jessica",
  "Thomas",
  "Sarah",
  "Charles",
  "Karen",
  "Christopher",
  "Nancy",
  "Daniel",
  "Lisa",
  "Matthew",
  "Betty",
  "Anthony",
  "Margaret",
  "Mark",
  "Sandra",
  "Donald",
  "Ashley",
  "Steven",
  "Kimberly",
  "Paul",
  "Emily",
  "Andrew",
  "Donna",
  "Joshua",
  "Michelle",
  "Kenneth",
  "Dorothy",
  "Kevin",
  "Carol",
  "Brian",
  "Amanda",
  "George",
  "Melissa",
  "Timothy",
  "Deborah",
  "Ronald",
  "Stephanie",
  "Edward",
  "Rebecca",
  "Jason",
  "Sharon",
  "Jeffrey",
  "Laura",
  "Ryan",
  "Cynthia",
  "Jacob",
  "Kathleen",
  "Gary",
  "Amy",
  "Nicholas",
  "Angela",
  "Eric",
  "Shirley",
  "Jonathan",
  "Anna",
  "Stephen",
  "Brenda",
  "Larry",
  "Pamela",
  "Justin",
  "Emma",
  "Scott",
  "Nicole",
  "Brandon",
  "Helen",
  "Benjamin",
  "Samantha",
  "Samuel",
  "Katherine",
  "Raymond",
  "Christine",
  "Gregory",
  "Debra",
  "Frank",
  "Rachel",
  "Alexander",
  "Carolyn",
  "Patrick",
  "Janet",
  "Jack",
  "Catherine",
  "Aiden",
  "Olivia",
  "Ethan",
  "Sophia",
  "Mason",
  "Isabella",
  "Lucas",
  "Mia",
  "Noah",
  "Charlotte",
  "Liam",
  "Amelia",
  "Oliver",
  "Harper",
  "Elijah",
  "Evelyn",
  "Raj",
  "Priya",
  "Amit",
  "Sneha",
  "Vikram",
  "Ananya",
  "Arjun",
  "Divya",
  "Wei",
  "Mei",
  "Chen",
  "Lin",
  "Yuki",
  "Sakura",
  "Hiroshi",
  "Kenji",
  "Mohammed",
  "Fatima",
  "Ali",
  "Aisha",
  "Omar",
  "Layla",
  "Hassan",
  "Noor",
  "Carlos",
  "Maria",
  "Juan",
  "Sofia",
  "Miguel",
  "Isabella",
  "Pedro",
  "Valentina",
  "Hans",
  "Anna",
  "Klaus",
  "Eva",
  "Stefan",
  "Heidi",
  "Franz",
  "Ingrid",
  "Pierre",
  "Marie",
  "Jean",
  "Claire",
  "Louis",
  "Sophie",
  "Antoine",
  "Camille",
];

const lastNames = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Hernandez",
  "Lopez",
  "Gonzalez",
  "Wilson",
  "Anderson",
  "Thomas",
  "Taylor",
  "Moore",
  "Jackson",
  "Martin",
  "Lee",
  "Perez",
  "Thompson",
  "White",
  "Harris",
  "Sanchez",
  "Clark",
  "Ramirez",
  "Lewis",
  "Robinson",
  "Walker",
  "Young",
  "Allen",
  "King",
  "Wright",
  "Scott",
  "Torres",
  "Nguyen",
  "Hill",
  "Flores",
  "Green",
  "Adams",
  "Nelson",
  "Baker",
  "Hall",
  "Rivera",
  "Campbell",
  "Mitchell",
  "Carter",
  "Roberts",
  "Gomez",
  "Phillips",
  "Evans",
  "Turner",
  "Diaz",
  "Parker",
  "Cruz",
  "Edwards",
  "Collins",
  "Reyes",
  "Stewart",
  "Morris",
  "Morales",
  "Murphy",
  "Cook",
  "Rogers",
  "Gutierrez",
  "Ortiz",
  "Morgan",
  "Cooper",
  "Peterson",
  "Bailey",
  "Reed",
  "Kelly",
  "Howard",
  "Ramos",
  "Kim",
  "Cox",
  "Ward",
  "Richardson",
  "Watson",
  "Brooks",
  "Chavez",
  "Wood",
  "James",
  "Bennett",
  "Gray",
  "Mendoza",
  "Ruiz",
  "Hughes",
  "Price",
  "Alvarez",
  "Castillo",
  "Sanders",
  "Patel",
  "Myers",
  "Long",
  "Ross",
  "Foster",
  "Jimenez",
  "Powell",
  "Jenkins",
  "Perry",
  "Russell",
  "Kumar",
  "Singh",
  "Sharma",
  "Gupta",
  "Verma",
  "Chopra",
  "Mehta",
  "Joshi",
  "Wang",
  "Zhang",
  "Liu",
  "Chen",
  "Yang",
  "Huang",
  "Zhao",
  "Wu",
  "Tanaka",
  "Yamamoto",
  "Watanabe",
  "Suzuki",
  "Takahashi",
  "Sato",
  "Nakamura",
  "Kobayashi",
  "Müller",
  "Schmidt",
  "Schneider",
  "Fischer",
  "Weber",
  "Meyer",
  "Wagner",
  "Becker",
  "Dubois",
  "Laurent",
  "Bernard",
  "Robert",
  "Richard",
  "Petit",
  "Durand",
  "Leroy",
  "Ahmed",
  "Hassan",
  "Ali",
  "Khan",
  "Mohammed",
  "Ibrahim",
  "Youssef",
  "Omar",
];

const domains = [
  "techcorp.com",
  "innovate.io",
  "devhub.net",
  "cloudworks.co",
  "dataflow.org",
  "codebase.dev",
  "appforge.tech",
  "systempro.com",
  "netsolve.io",
  "bytestream.co",
  "quantum.dev",
  "nexustech.com",
  "cyberlink.io",
  "infosys.net",
  "digisphere.org",
  "codeflow.tech",
  "devops.pro",
  "cloudnine.io",
  "techtonic.com",
  "byteforge.dev",
];

const taskTitles = {
  developer: [
    "Implement user authentication module",
    "Fix bug in payment processing",
    "Refactor database queries for performance",
    "Add unit tests for API endpoints",
    "Implement REST API for mobile app",
    "Debug memory leak in background service",
    "Create reusable React components",
    "Optimize frontend bundle size",
    "Implement WebSocket real-time updates",
    "Add input validation and sanitization",
    "Migrate legacy code to TypeScript",
    "Implement caching layer for API",
    "Fix cross-browser compatibility issues",
    "Add pagination to list endpoints",
    "Implement file upload functionality",
    "Create database migration scripts",
    "Add error handling and logging",
    "Implement search functionality",
    "Fix responsive design issues",
    "Add data export feature",
  ],
  architect: [
    "Design microservices architecture",
    "Create system design documentation",
    "Evaluate new technology stack",
    "Design database schema for new feature",
    "Create API design specifications",
    "Review and approve technical decisions",
    "Design scalability strategy",
    "Create security architecture document",
    "Evaluate cloud service providers",
    "Design event-driven architecture",
    "Create disaster recovery plan",
    "Design data pipeline architecture",
    "Review system performance bottlenecks",
    "Design multi-tenant architecture",
    "Create integration architecture",
  ],
  devops: [
    "Set up CI/CD pipeline",
    "Configure Kubernetes cluster",
    "Implement infrastructure as code",
    "Set up monitoring and alerting",
    "Configure load balancer",
    "Implement automated backups",
    "Set up log aggregation system",
    "Configure SSL certificates",
    "Optimize Docker containers",
    "Set up staging environment",
    "Implement blue-green deployment",
    "Configure auto-scaling policies",
    "Set up security scanning in pipeline",
    "Migrate to new cloud region",
    "Implement secrets management",
  ],
  product: [
    "Write user stories for new feature",
    "Create product roadmap",
    "Conduct user research interviews",
    "Analyze competitor features",
    "Define acceptance criteria",
    "Create wireframes for new screens",
    "Prioritize backlog items",
    "Write product requirements document",
    "Plan sprint goals",
    "Conduct stakeholder meetings",
    "Create feature specification",
    "Analyze user feedback data",
    "Define success metrics",
    "Plan product launch",
    "Create user onboarding flow",
  ],
};

const taskDescriptions = [
  "This task requires careful attention to detail and thorough testing before deployment.",
  "Please ensure all edge cases are handled and documented appropriately.",
  "Coordinate with the team to ensure alignment with project goals.",
  "Follow the established coding standards and best practices.",
  "Include appropriate documentation and comments in the code.",
  "Consider performance implications and optimize where necessary.",
  "Ensure backward compatibility with existing features.",
  "Add comprehensive error handling and user-friendly messages.",
  "Test thoroughly in staging environment before production deployment.",
  "Update relevant documentation after completion.",
];

const tags = [
  "frontend",
  "backend",
  "api",
  "database",
  "security",
  "performance",
  "bug-fix",
  "feature",
  "refactor",
  "testing",
  "documentation",
  "urgent",
  "infrastructure",
  "deployment",
  "monitoring",
  "optimization",
  "migration",
  "integration",
  "ui-ux",
  "mobile",
  "cloud",
  "devops",
  "architecture",
];

// Utility functions
function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomElements<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateEmail(
  firstName: string,
  lastName: string,
  index: number
): string {
  const domain = getRandomElement(domains);
  const variations = [
    `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()}${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()}_${lastName.toLowerCase()}`,
    `${firstName[0].toLowerCase()}${lastName.toLowerCase()}`,
    `${firstName.toLowerCase()}${index}`,
  ];
  return `${getRandomElement(variations)}@${domain}`;
}

function generatePassword(): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function getRoleByDistribution(): string {
  const rand = Math.random();
  let cumulative = 0;
  for (const [role, percentage] of Object.entries(ROLE_DISTRIBUTION)) {
    cumulative += percentage;
    if (rand <= cumulative) return role;
  }
  return "developer";
}

function getAccessLevelByDistribution(): string {
  const rand = Math.random();
  let cumulative = 0;
  for (const [level, percentage] of Object.entries(ACCESS_LEVEL_DISTRIBUTION)) {
    cumulative += percentage;
    if (rand <= cumulative) return level;
  }
  return "member";
}

function getRandomDueDate(): number {
  const now = Date.now();
  const daysOffset = Math.floor(Math.random() * 90) - 30; // -30 to +60 days
  return now + daysOffset * 24 * 60 * 60 * 1000;
}

function getRandomCreatedAt(): number {
  const now = Date.now();
  const daysAgo = Math.floor(Math.random() * 180); // Up to 180 days ago
  return now - daysAgo * 24 * 60 * 60 * 1000;
}

// Main seeding function
async function seedDatabase() {
  console.log("🚀 Starting database seeding...\n");

  const mongoUri =
    process.env.MONGODB_URI ||
    "mongodb://localhost:27017/enterprise-automation";

  try {
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB\n");

    // Check for existing organization or create one
    let organization = await Organization.findOne();

    if (!organization) {
      console.log("📦 Creating default organization...");
      organization = await Organization.create({
        name: "Enterprise Automation Inc",
        slug: "enterprise-automation",
        branding: {
          companyName: "Enterprise Automation Inc",
          primaryColor: "#3b82f6",
          accentColor: "#8b5cf6",
          tagline: "Automate Everything",
        },
        subscription: {
          plan: "enterprise",
          status: "active",
        },
        limits: {
          maxUsers: -1,
          maxTasks: -1,
          maxStorage: -1,
          maxApiCalls: -1,
          features: ["all"],
        },
        settings: {
          defaultTimezone: "UTC",
          defaultLanguage: "en",
          dateFormat: "MM/DD/YYYY",
          allowPublicSignup: true,
          requireEmailVerification: false,
        },
        ownerId: "temp-owner-id",
      });
      console.log("✅ Organization created\n");
    }

    const organizationId = organization._id.toString();

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log("🗑️  Clearing existing users and tasks...");
    await TeamMember.deleteMany({ organizationId });
    await Task.deleteMany({ organizationId });
    console.log("✅ Cleared existing data\n");

    // Generate users
    console.log(`👥 Generating ${TOTAL_USERS} users...`);
    const users: any[] = [];
    const credentials: {
      email: string;
      password: string;
      role: string;
      accessLevel: string;
      name: string;
    }[] = [];
    const usedEmails = new Set<string>();

    for (let i = 0; i < TOTAL_USERS; i++) {
      const firstName = getRandomElement(firstNames);
      const lastName = getRandomElement(lastNames);
      let email = generateEmail(firstName, lastName, i);

      // Ensure unique email
      while (usedEmails.has(email)) {
        email = generateEmail(
          firstName,
          lastName,
          i + Math.floor(Math.random() * 10000)
        );
      }
      usedEmails.add(email);

      const password = generatePassword();
      const role = getRoleByDistribution();
      const accessLevel = getAccessLevelByDistribution();
      const name = `${firstName} ${lastName}`;

      users.push({
        organizationId,
        name,
        email,
        password,
        role,
        accessLevel,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
          name
        )}`,
        isOnline: Math.random() > 0.7,
        lastSeen: new Date(),
      });

      credentials.push({
        name,
        email,
        password,
        role,
        accessLevel,
      });

      if ((i + 1) % 1000 === 0) {
        console.log(`   Generated ${i + 1}/${TOTAL_USERS} users...`);
      }
    }

    // Hash passwords and insert users in batches
    console.log("\n🔐 Hashing passwords and inserting users...");
    const insertedUsers: any[] = [];

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);

      // Hash passwords for batch
      const hashedBatch = await Promise.all(
        batch.map(async (user) => {
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(user.password, salt);
          return { ...user, password: hashedPassword };
        })
      );

      const inserted = await TeamMember.insertMany(hashedBatch);
      insertedUsers.push(...inserted);

      console.log(
        `   Inserted ${Math.min(
          i + BATCH_SIZE,
          users.length
        )}/${TOTAL_USERS} users...`
      );
    }

    // Update organization owner
    const ownerUser =
      insertedUsers.find((u) => u.accessLevel === "owner") || insertedUsers[0];
    await Organization.updateOne(
      { _id: organization._id },
      { ownerId: ownerUser._id.toString() }
    );

    // Group users by role for task assignment
    const usersByRole: Record<string, any[]> = {
      developer: [],
      architect: [],
      devops: [],
      product: [],
    };

    insertedUsers.forEach((user) => {
      if (usersByRole[user.role]) {
        usersByRole[user.role].push(user);
      }
    });

    console.log("\n📊 User distribution:");
    Object.entries(usersByRole).forEach(([role, users]) => {
      console.log(`   ${role}: ${users.length} users`);
    });

    // Generate tasks
    console.log(`\n📝 Generating ${TOTAL_TASKS} tasks...`);
    const tasks: any[] = [];
    const statuses = ["todo", "in-progress", "review", "done"];
    const priorities = ["low", "medium", "high", "critical"];
    const contextTypes = ["service", "workflow", "roadmap", "general"];

    for (let i = 0; i < TOTAL_TASKS; i++) {
      // Determine role for this task based on weights
      const rand = Math.random();
      let cumulative = 0;
      let assigneeRole = "developer";

      for (const [role, weight] of Object.entries(TASK_ASSIGNMENT_WEIGHTS)) {
        cumulative += weight;
        if (rand <= cumulative) {
          assigneeRole = role;
          break;
        }
      }

      const assignee = getRandomElement(usersByRole[assigneeRole]);
      const creator = getRandomElement(insertedUsers);
      const createdAt = getRandomCreatedAt();

      const taskTitleList = taskTitles[assigneeRole as keyof typeof taskTitles];
      const title = `${getRandomElement(taskTitleList)} #${i + 1}`;

      tasks.push({
        organizationId,
        title,
        description: getRandomElement(taskDescriptions),
        status: getRandomElement(statuses),
        priority: getRandomElement(priorities),
        assigneeId: assignee._id.toString(),
        creatorId: creator._id.toString(),
        contextType: getRandomElement(contextTypes),
        dueDate: Math.random() > 0.3 ? getRandomDueDate() : null,
        createdAt,
        updatedAt:
          createdAt + Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000),
        tags: getRandomElements(tags, Math.floor(Math.random() * 4) + 1),
        comments: [],
        dependencies: [],
      });

      if ((i + 1) % 2000 === 0) {
        console.log(`   Generated ${i + 1}/${TOTAL_TASKS} tasks...`);
      }
    }

    // Insert tasks in batches
    console.log("\n💾 Inserting tasks...");
    for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
      const batch = tasks.slice(i, i + BATCH_SIZE);
      await Task.insertMany(batch);
      console.log(
        `   Inserted ${Math.min(
          i + BATCH_SIZE,
          tasks.length
        )}/${TOTAL_TASKS} tasks...`
      );
    }

    // Save credentials to JSON file
    const credentialsPath = path.join(__dirname, "user-credentials.json");
    const credentialsData = {
      generatedAt: new Date().toISOString(),
      totalUsers: TOTAL_USERS,
      totalTasks: TOTAL_TASKS,
      organizationId,
      organizationName: organization.name,
      credentials: credentials,
    };

    fs.writeFileSync(credentialsPath, JSON.stringify(credentialsData, null, 2));
    console.log(`\n📄 Credentials saved to: ${credentialsPath}`);

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("✨ SEEDING COMPLETE!");
    console.log("=".repeat(60));
    console.log(`\n📊 Summary:`);
    console.log(`   Organization: ${organization.name}`);
    console.log(`   Total Users: ${TOTAL_USERS}`);
    console.log(`   Total Tasks: ${TOTAL_TASKS}`);
    console.log(`\n👥 Users by Role:`);
    Object.entries(usersByRole).forEach(([role, users]) => {
      console.log(`   - ${role}: ${users.length}`);
    });
    console.log(`\n🔑 Access Levels:`);
    const accessCounts = insertedUsers.reduce((acc, user) => {
      acc[user.accessLevel] = (acc[user.accessLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    Object.entries(accessCounts).forEach(([level, count]) => {
      console.log(`   - ${level}: ${count}`);
    });
    console.log(`\n📄 Credentials file: ${credentialsPath}`);
    console.log("\n");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run the seeding
seedDatabase().catch(console.error);

import { AccessLevel, Permission } from "@/lib/collaboration-data";

export const priorityColors = {
  low: "text-blue-600 dark:text-blue-400",
  medium: "text-amber-600 dark:text-amber-400",
  high: "text-orange-600 dark:text-orange-400",
  critical: "text-red-600 dark:text-red-400",
};

export const statusColors = {
  todo: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
  "in-progress":
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
  review:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-800",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
};

export const roleColors = {
  architect:
    "bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  developer: "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  devops:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  product:
    "bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
};

export const accessLevelColors = {
  owner: "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm",
  admin: "bg-blue-600 text-white shadow-sm",
  member: "bg-emerald-600 text-white shadow-sm",
  viewer: "bg-slate-500 text-white shadow-sm dark:bg-slate-600",
};

export const accessLevelIcons = {
  owner: "👑",
  admin: "⚡",
  member: "✓",
  viewer: "👁️",
};

export const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

export const allPermissions: Permission[] = [
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
];

export const permissionDescriptions: Record<Permission, string> = {
  manage_team: "Add, edit, and remove team members",
  manage_roles: "Change member roles and responsibilities",
  manage_permissions: "Modify access levels and custom permissions",
  create_tasks: "Create new tasks and assignments",
  assign_tasks: "Assign tasks to team members",
  delete_tasks: "Delete any task in the system",
  edit_all_tasks: "Edit any task regardless of assignment",
  create_comments: "Post comments and discussions",
  delete_comments: "Delete any comment in the system",
  manage_services: "Create and modify service definitions",
  manage_workflows: "Create and modify workflow definitions",
  manage_roadmap: "Manage roadmap phases and milestones",
  view_analytics: "Access analytics and reports",
  export_data: "Export system data and reports",
};

export const permissionCategories = {
  "Team Management": [
    "manage_team",
    "manage_roles",
    "manage_permissions",
  ] as Permission[],
  "Task Management": [
    "create_tasks",
    "assign_tasks",
    "delete_tasks",
    "edit_all_tasks",
  ] as Permission[],
  Collaboration: ["create_comments", "delete_comments"] as Permission[],
  Architecture: [
    "manage_services",
    "manage_workflows",
    "manage_roadmap",
  ] as Permission[],
  "Data & Analytics": ["view_analytics", "export_data"] as Permission[],
};

export const accessLevelDescriptions: Record<
  AccessLevel,
  { description: string; color: string }
> = {
  owner: {
    description:
      "Full system access with all permissions. Can manage everything including other owners.",
    color:
      "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-300",
  },
  admin: {
    description:
      "Administrative access to manage team, content, and most system features.",
    color:
      "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300",
  },
  member: {
    description:
      "Standard access to create tasks, collaborate, and participate in discussions.",
    color:
      "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300",
  },
  viewer: {
    description:
      "Read-only access with ability to view content and add comments.",
    color:
      "bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-300",
  },
};

export const roleDescriptions = {
  architect: {
    description:
      "System design, technical leadership, and architectural decisions",
    suggestedAccess: "admin" as AccessLevel,
    icon: "🏗️",
  },
  developer: {
    description: "Code implementation, feature development, and bug fixes",
    suggestedAccess: "member" as AccessLevel,
    icon: "💻",
  },
  devops: {
    description: "Infrastructure, deployment, and operational excellence",
    suggestedAccess: "admin" as AccessLevel,
    icon: "🔧",
  },
  product: {
    description:
      "Product strategy, roadmap planning, and stakeholder coordination",
    suggestedAccess: "member" as AccessLevel,
    icon: "📊",
  },
};

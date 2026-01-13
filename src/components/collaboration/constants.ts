import { AccessLevel, Permission } from '@/lib/collaboration-data'

export const priorityColors = {
  low: 'text-blue-600',
  medium: 'text-yellow-600',
  high: 'text-orange-600',
  critical: 'text-red-600'
}

export const statusColors = {
  todo: 'bg-gray-500/10 text-gray-700 border-gray-500/20',
  'in-progress': 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  review: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  done: 'bg-green-500/10 text-green-700 border-green-500/20'
}

export const roleColors = {
  architect: 'bg-purple-500/10 text-purple-700',
  developer: 'bg-blue-500/10 text-blue-700',
  devops: 'bg-green-500/10 text-green-700',
  product: 'bg-orange-500/10 text-orange-700'
}

export const accessLevelColors = {
  owner: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
  admin: 'bg-blue-500/90 text-white',
  member: 'bg-green-500/90 text-white',
  viewer: 'bg-gray-500/90 text-white'
}

export const accessLevelIcons = {
  owner: '👑',
  admin: '⚡',
  member: '✓',
  viewer: '👁️'
}

export const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }

export const allPermissions: Permission[] = [
  'manage_team',
  'manage_roles',
  'manage_permissions',
  'create_tasks',
  'assign_tasks',
  'delete_tasks',
  'edit_all_tasks',
  'create_comments',
  'delete_comments',
  'manage_services',
  'manage_workflows',
  'manage_roadmap',
  'view_analytics',
  'export_data'
]

export const permissionDescriptions: Record<Permission, string> = {
  manage_team: 'Add, edit, and remove team members',
  manage_roles: 'Change member roles and responsibilities',
  manage_permissions: 'Modify access levels and custom permissions',
  create_tasks: 'Create new tasks and assignments',
  assign_tasks: 'Assign tasks to team members',
  delete_tasks: 'Delete any task in the system',
  edit_all_tasks: 'Edit any task regardless of assignment',
  create_comments: 'Post comments and discussions',
  delete_comments: 'Delete any comment in the system',
  manage_services: 'Create and modify service definitions',
  manage_workflows: 'Create and modify workflow definitions',
  manage_roadmap: 'Manage roadmap phases and milestones',
  view_analytics: 'Access analytics and reports',
  export_data: 'Export system data and reports'
}

export const permissionCategories = {
  'Team Management': ['manage_team', 'manage_roles', 'manage_permissions'] as Permission[],
  'Task Management': ['create_tasks', 'assign_tasks', 'delete_tasks', 'edit_all_tasks'] as Permission[],
  'Collaboration': ['create_comments', 'delete_comments'] as Permission[],
  'Architecture': ['manage_services', 'manage_workflows', 'manage_roadmap'] as Permission[],
  'Data & Analytics': ['view_analytics', 'export_data'] as Permission[]
}

export const accessLevelDescriptions: Record<AccessLevel, { description: string; color: string }> = {
  owner: {
    description: 'Full system access with all permissions. Can manage everything including other owners.',
    color: 'bg-purple-500/20 border-purple-500/50 text-purple-700 dark:text-purple-300'
  },
  admin: {
    description: 'Administrative access to manage team, content, and most system features.',
    color: 'bg-blue-500/20 border-blue-500/50 text-blue-700 dark:text-blue-300'
  },
  member: {
    description: 'Standard access to create tasks, collaborate, and participate in discussions.',
    color: 'bg-green-500/20 border-green-500/50 text-green-700 dark:text-green-300'
  },
  viewer: {
    description: 'Read-only access with ability to view content and add comments.',
    color: 'bg-gray-500/20 border-gray-500/50 text-gray-700 dark:text-gray-300'
  }
}

export const roleDescriptions = {
  architect: {
    description: 'System design, technical leadership, and architectural decisions',
    suggestedAccess: 'admin' as AccessLevel,
    icon: '🏗️'
  },
  developer: {
    description: 'Code implementation, feature development, and bug fixes',
    suggestedAccess: 'member' as AccessLevel,
    icon: '💻'
  },
  devops: {
    description: 'Infrastructure, deployment, and operational excellence',
    suggestedAccess: 'admin' as AccessLevel,
    icon: '🔧'
  },
  product: {
    description: 'Product strategy, roadmap planning, and stakeholder coordination',
    suggestedAccess: 'member' as AccessLevel,
    icon: '📊'
  }
}

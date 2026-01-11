export type AccessLevel = 'owner' | 'admin' | 'member' | 'viewer'

export type Permission =
  | 'manage_team'
  | 'manage_roles'
  | 'manage_permissions'
  | 'create_tasks'
  | 'assign_tasks'
  | 'delete_tasks'
  | 'edit_all_tasks'
  | 'create_comments'
  | 'delete_comments'
  | 'manage_services'
  | 'manage_workflows'
  | 'manage_roadmap'
  | 'view_analytics'
  | 'export_data'

export const ACCESS_LEVEL_PERMISSIONS: Record<AccessLevel, Permission[]> = {
  owner: [
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
  ],
  admin: [
    'manage_team',
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
  ],
  member: [
    'create_tasks',
    'assign_tasks',
    'create_comments',
    'view_analytics',
    'export_data'
  ],
  viewer: [
    'create_comments'
  ]
}

export interface TeamMember {
  id: string
  name: string
  email: string
  role: 'architect' | 'developer' | 'devops' | 'product'
  accessLevel: AccessLevel
  customPermissions?: Permission[]
  avatarUrl?: string
  isOnline: boolean
}

export interface Comment {
  id: string
  authorId: string
  content: string
  timestamp: number
  contextType: 'service' | 'workflow' | 'roadmap' | 'general'
  contextId: string
  replies: Comment[]
  reactions: Reaction[]
  mentions: string[]
  isResolved: boolean
}

export interface Reaction {
  emoji: string
  userId: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: 'todo' | 'in-progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'critical'
  assigneeId?: string
  creatorId: string
  contextType: 'service' | 'workflow' | 'roadmap' | 'general'
  contextId?: string
  dueDate?: number
  createdAt: number
  updatedAt: number
  tags: string[]
  comments: string[]
  dependencies?: string[]
}

export interface Activity {
  id: string
  userId: string
  type: 'comment' | 'task-created' | 'task-updated' | 'task-assigned' | 'mention'
  timestamp: number
  contextType: string
  contextId: string
  content: string
}

export function hasPermission(member: TeamMember, permission: Permission): boolean {
  const basePermissions = ACCESS_LEVEL_PERMISSIONS[member.accessLevel] || []
  const customPermissions = member.customPermissions || []
  return basePermissions.includes(permission) || customPermissions.includes(permission)
}

export function canManageTeam(member: TeamMember): boolean {
  return hasPermission(member, 'manage_team')
}

export function canEditTask(member: TeamMember, task: Task): boolean {
  if (hasPermission(member, 'edit_all_tasks')) return true
  return task.creatorId === member.id || task.assigneeId === member.id
}

export const mockTeamMembers: TeamMember[] = [
  {
    id: 'user-1',
    name: 'Sarah Chen',
    email: 'sarah.chen@example.com',
    role: 'architect',
    accessLevel: 'owner',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    isOnline: true
  },
  {
    id: 'user-2',
    name: 'Michael Torres',
    email: 'michael.torres@example.com',
    role: 'developer',
    accessLevel: 'admin',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
    isOnline: true
  },
  {
    id: 'user-3',
    name: 'Priya Patel',
    email: 'priya.patel@example.com',
    role: 'devops',
    accessLevel: 'member',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya',
    isOnline: false
  },
  {
    id: 'user-4',
    name: 'James Wilson',
    email: 'james.wilson@example.com',
    role: 'product',
    accessLevel: 'viewer',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James',
    isOnline: true
  }
]

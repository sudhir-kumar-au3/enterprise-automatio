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
  },
  {
    id: 'user-5',
    name: 'Elena Rodriguez',
    email: 'elena.rodriguez@example.com',
    role: 'developer',
    accessLevel: 'member',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena',
    isOnline: true
  },
  {
    id: 'user-6',
    name: 'David Kim',
    email: 'david.kim@example.com',
    role: 'developer',
    accessLevel: 'member',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    isOnline: true
  },
  {
    id: 'user-7',
    name: 'Aisha Mohammed',
    email: 'aisha.mohammed@example.com',
    role: 'devops',
    accessLevel: 'admin',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aisha',
    isOnline: true
  },
  {
    id: 'user-8',
    name: 'Lucas Silva',
    email: 'lucas.silva@example.com',
    role: 'developer',
    accessLevel: 'member',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas',
    isOnline: false
  },
  {
    id: 'user-9',
    name: 'Olivia Johnson',
    email: 'olivia.johnson@example.com',
    role: 'product',
    accessLevel: 'admin',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Olivia',
    isOnline: true
  },
  {
    id: 'user-10',
    name: 'Raj Sharma',
    email: 'raj.sharma@example.com',
    role: 'architect',
    accessLevel: 'member',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Raj',
    isOnline: false
  },
  {
    id: 'user-11',
    name: 'Sophie Martin',
    email: 'sophie.martin@example.com',
    role: 'product',
    accessLevel: 'member',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie',
    isOnline: true
  },
  {
    id: 'user-12',
    name: 'Alex Thompson',
    email: 'alex.thompson@example.com',
    role: 'devops',
    accessLevel: 'member',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    isOnline: true
  },
  {
    id: 'user-13',
    name: 'Maria Garcia',
    email: 'maria.garcia@example.com',
    role: 'developer',
    accessLevel: 'member',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
    isOnline: false
  },
  {
    id: 'user-14',
    name: 'Chen Wei',
    email: 'chen.wei@example.com',
    role: 'architect',
    accessLevel: 'admin',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ChenWei',
    isOnline: true
  },
  {
    id: 'user-15',
    name: 'Emma Brown',
    email: 'emma.brown@example.com',
    role: 'product',
    accessLevel: 'viewer',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
    isOnline: false
  }
]

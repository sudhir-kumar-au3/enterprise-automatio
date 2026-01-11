export interface TeamMember {
  id: string
  name: string
  email: string
  role: 'architect' | 'developer' | 'devops' | 'product'
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

export const mockTeamMembers: TeamMember[] = [
  {
    id: 'user-1',
    name: 'Sarah Chen',
    email: 'sarah.chen@example.com',
    role: 'architect',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    isOnline: true
  },
  {
    id: 'user-2',
    name: 'Michael Torres',
    email: 'michael.torres@example.com',
    role: 'developer',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
    isOnline: true
  },
  {
    id: 'user-3',
    name: 'Priya Patel',
    email: 'priya.patel@example.com',
    role: 'devops',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya',
    isOnline: false
  },
  {
    id: 'user-4',
    name: 'James Wilson',
    email: 'james.wilson@example.com',
    role: 'product',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James',
    isOnline: true
  }
]

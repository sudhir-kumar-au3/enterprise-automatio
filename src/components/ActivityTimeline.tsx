import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  CheckCircle, 
  ChatCircleDots, 
  Plus, 
  ArrowRight,
  FlagBanner,
  Users,
  Clock,
  PencilSimple
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import type { Task, Comment, TeamMember } from '@/lib/collaboration-data'

interface ActivityTimelineProps {
  tasks: Task[]
  comments: Comment[]
  teamMembers: TeamMember[]
}

type ActivityItem = {
  id: string
  type: 'task_created' | 'task_updated' | 'task_completed' | 'comment_created' | 'status_changed'
  timestamp: number
  userId: string
  taskId?: string
  taskTitle?: string
  commentContent?: string
  oldStatus?: string
  newStatus?: string
  priority?: Task['priority']
}

const statusColors = {
  todo: 'text-gray-600 dark:text-gray-400',
  'in-progress': 'text-blue-600 dark:text-blue-400',
  review: 'text-purple-600 dark:text-purple-400',
  done: 'text-green-600 dark:text-green-400'
}

const priorityColors = {
  low: 'text-blue-500',
  medium: 'text-yellow-500',
  high: 'text-orange-500',
  critical: 'text-red-500'
}

const ActivityTimeline = ({ tasks, comments, teamMembers }: ActivityTimelineProps) => {
  const generateActivities = (): ActivityItem[] => {
    const activities: ActivityItem[] = []

    tasks.forEach(task => {
      activities.push({
        id: `task-create-${task.id}`,
        type: 'task_created',
        timestamp: task.createdAt,
        userId: task.creatorId,
        taskId: task.id,
        taskTitle: task.title,
        priority: task.priority
      })

      if (task.updatedAt && task.updatedAt !== task.createdAt) {
        if (task.status === 'done') {
          activities.push({
            id: `task-complete-${task.id}`,
            type: 'task_completed',
            timestamp: task.updatedAt,
            userId: task.assigneeId || task.creatorId,
            taskId: task.id,
            taskTitle: task.title
          })
        } else {
          activities.push({
            id: `task-update-${task.id}`,
            type: 'task_updated',
            timestamp: task.updatedAt,
            userId: task.assigneeId || task.creatorId,
            taskId: task.id,
            taskTitle: task.title,
            newStatus: task.status
          })
        }
      }
    })

    comments.forEach(comment => {
      activities.push({
        id: `comment-${comment.id}`,
        type: 'comment_created',
        timestamp: comment.timestamp,
        userId: comment.authorId,
        commentContent: comment.content
      })
    })

    return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20)
  }

  const activities = generateActivities()

  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return new Date(timestamp).toLocaleDateString()
  }

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'task_created':
        return <Plus size={16} weight="bold" className="text-primary" />
      case 'task_completed':
        return <CheckCircle size={16} weight="fill" className="text-green-600" />
      case 'task_updated':
        return <PencilSimple size={16} weight="bold" className="text-blue-600" />
      case 'comment_created':
        return <ChatCircleDots size={16} weight="duotone" className="text-accent" />
      default:
        return <Clock size={16} weight="duotone" className="text-muted-foreground" />
    }
  }

  const renderActivityContent = (activity: ActivityItem) => {
    const user = teamMembers.find(m => m.id === activity.userId)
    const userName = user?.name || 'Someone'

    switch (activity.type) {
      case 'task_created':
        return (
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-semibold">{userName}</span> created task
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-muted-foreground line-clamp-1">{activity.taskTitle}</p>
              {activity.priority && (
                <FlagBanner size={14} weight="fill" className={priorityColors[activity.priority]} />
              )}
            </div>
          </div>
        )
      case 'task_completed':
        return (
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-semibold">{userName}</span> completed task
            </p>
            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{activity.taskTitle}</p>
          </div>
        )
      case 'task_updated':
        return (
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-semibold">{userName}</span> updated task
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-muted-foreground line-clamp-1">{activity.taskTitle}</p>
              {activity.newStatus && (
                <Badge variant="outline" className={`text-xs ${statusColors[activity.newStatus as keyof typeof statusColors]}`}>
                  {activity.newStatus.replace('-', ' ')}
                </Badge>
              )}
            </div>
          </div>
        )
      case 'comment_created':
        return (
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-semibold">{userName}</span> added a comment
            </p>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{activity.commentContent}</p>
          </div>
        )
      default:
        return null
    }
  }

  if (activities.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock size={20} weight="duotone" className="text-primary" />
            Activity Timeline
          </CardTitle>
          <CardDescription>Recent team actions and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center">
            <Clock size={48} className="mx-auto text-muted-foreground/50 mb-2" weight="duotone" />
            <p className="text-sm text-muted-foreground">
              No activity yet. Start creating tasks and collaborating!
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock size={20} weight="duotone" className="text-primary" />
          Activity Timeline
        </CardTitle>
        <CardDescription>Recent team actions and updates</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="relative">
            <div className="absolute left-[21px] top-2 bottom-2 w-px bg-border" />
            
            <div className="space-y-4">
              {activities.map((activity, index) => {
                const user = teamMembers.find(m => m.id === activity.userId)
                
                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="relative flex gap-3 group"
                  >
                    <div className="relative z-10 flex-shrink-0">
                      <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm group-hover:ring-primary/50 transition-all">
                        <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                        <AvatarFallback className="text-xs">
                          {user?.name.split(' ').map(n => n[0]).join('') || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-background border-2 border-background flex items-center justify-center shadow-sm">
                        {getActivityIcon(activity.type)}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        {renderActivityContent(activity)}
                        <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                          {getTimeAgo(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export default ActivityTimeline

import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Users, 
  ChatCircleDots, 
  CheckSquare, 
  Plus, 
  PaperPlaneTilt,
  DotsThree,
  CheckCircle,
  Clock,
  ArrowRight,
  Tag,
  CalendarBlank,
  FlagBanner,
  Circle
} from '@phosphor-icons/react'
import { mockTeamMembers, Comment, Task, TeamMember } from '@/lib/collaboration-data'
import { services } from '@/lib/architecture-data'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const priorityColors = {
  low: 'text-blue-600',
  medium: 'text-yellow-600',
  high: 'text-orange-600',
  critical: 'text-red-600'
}

const statusColors = {
  todo: 'bg-gray-500/10 text-gray-700 border-gray-500/20',
  'in-progress': 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  review: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  done: 'bg-green-500/10 text-green-700 border-green-500/20'
}

const roleColors = {
  architect: 'bg-purple-500/10 text-purple-700',
  developer: 'bg-blue-500/10 text-blue-700',
  devops: 'bg-green-500/10 text-green-700',
  product: 'bg-orange-500/10 text-orange-700'
}

const CollaborationView = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [comments, setComments] = useKV<Comment[]>('collaboration-comments', [])
  const [tasks, setTasks] = useKV<Task[]>('collaboration-tasks', [])
  const [newCommentText, setNewCommentText] = useState('')
  const [selectedContext, setSelectedContext] = useState<{ type: string; id: string } | null>(null)
  const [isCreatingTask, setIsCreatingTask] = useState(false)

  const currentUser = mockTeamMembers[0]

  const addComment = (contextType: string, contextId: string) => {
    if (!newCommentText.trim()) return

    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      authorId: currentUser.id,
      content: newCommentText,
      timestamp: Date.now(),
      contextType: contextType as any,
      contextId,
      replies: [],
      reactions: [],
      mentions: [],
      isResolved: false
    }

    setComments(current => [...(current || []), newComment])
    setNewCommentText('')
    toast.success('Comment added')
  }

  const getCommentsForContext = (contextType: string, contextId: string) => {
    return (comments || []).filter(c => c.contextType === contextType && c.contextId === contextId)
  }

  const getTasksForContext = (contextType: string, contextId: string) => {
    return (tasks || []).filter(t => t.contextType === contextType && t.contextId === contextId)
  }

  const onlineMembers = mockTeamMembers.filter(m => m.isOnline)
  const recentComments = (comments || []).slice(-5).reverse()
  const recentTasks = (tasks || [])
    .filter(t => t.status !== 'done')
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold mb-2">Team Collaboration</h2>
          <p className="text-muted-foreground text-lg">
            Coordinate tasks, share feedback, and track progress across the architecture
          </p>
        </div>
        <Dialog open={isCreatingTask} onOpenChange={setIsCreatingTask}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={18} />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <CreateTaskDialog
              onClose={() => setIsCreatingTask(false)}
              onCreate={(task) => {
                setTasks(current => [...(current || []), task])
                setIsCreatingTask(false)
                toast.success('Task created')
              }}
              currentUser={currentUser}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="overview" className="gap-2">
            <Users size={18} />
            Overview
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2">
            <CheckSquare size={18} />
            Tasks ({(tasks || []).filter(t => t.status !== 'done').length})
          </TabsTrigger>
          <TabsTrigger value="comments" className="gap-2">
            <ChatCircleDots size={18} />
            Comments ({(comments || []).length})
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users size={18} />
            Team ({mockTeamMembers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users size={20} weight="duotone" className="text-accent" />
                  Team Online
                </CardTitle>
                <CardDescription>
                  {onlineMembers.length} of {mockTeamMembers.length} members active
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {onlineMembers.map(member => (
                    <div key={member.id} className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatarUrl} alt={member.name} />
                          <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-card" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                      <Badge variant="secondary" className={roleColors[member.role]}>
                        {member.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare size={20} weight="duotone" className="text-accent" />
                  Active Tasks
                </CardTitle>
                <CardDescription>
                  {(tasks || []).filter(t => t.status === 'in-progress').length} in progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[280px]">
                  <div className="space-y-3">
                    {recentTasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-8 text-center">
                        No active tasks yet
                      </p>
                    ) : (
                      recentTasks.map(task => (
                        <TaskCard key={task.id} task={task} onClick={() => {}} compact />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChatCircleDots size={20} weight="duotone" className="text-accent" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest comments and discussions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentComments.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No comments yet. Start a discussion!
                  </p>
                ) : (
                  recentComments.map(comment => {
                    const author = mockTeamMembers.find(m => m.id === comment.authorId)
                    return (
                      <CommentCard key={comment.id} comment={comment} author={author} />
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <TasksView
            tasks={tasks || []}
            setTasks={setTasks}
            teamMembers={mockTeamMembers}
            currentUser={currentUser}
          />
        </TabsContent>

        <TabsContent value="comments" className="space-y-6">
          <CommentsView
            comments={comments || []}
            setComments={setComments}
            teamMembers={mockTeamMembers}
            currentUser={currentUser}
          />
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <TeamView teamMembers={mockTeamMembers} tasks={tasks || []} comments={comments || []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface TasksViewProps {
  tasks: Task[]
  setTasks: (updater: (tasks: Task[]) => Task[]) => void
  teamMembers: TeamMember[]
  currentUser: TeamMember
}

const TasksView = ({ tasks, setTasks, teamMembers, currentUser }: TasksViewProps) => {
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')

  const filteredTasks = tasks.filter(task => {
    if (filterStatus !== 'all' && task.status !== filterStatus) return false
    if (filterPriority !== 'all' && task.priority !== filterPriority) return false
    return true
  })

  const updateTaskStatus = (taskId: string, newStatus: Task['status']) => {
    setTasks(current => 
      current.map(t => t.id === taskId ? { ...t, status: newStatus, updatedAt: Date.now() } : t)
    )
    toast.success('Task updated')
  }

  const tasksByStatus = {
    todo: filteredTasks.filter(t => t.status === 'todo'),
    'in-progress': filteredTasks.filter(t => t.status === 'in-progress'),
    review: filteredTasks.filter(t => t.status === 'review'),
    done: filteredTasks.filter(t => t.status === 'done')
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid lg:grid-cols-4 gap-4">
        {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
          <Card key={status} className="bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium capitalize flex items-center justify-between">
                {status.replace('-', ' ')}
                <Badge variant="secondary" className="text-xs">
                  {statusTasks.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-2">
                  {statusTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => {}}
                      onStatusChange={(newStatus) => updateTaskStatus(task.id, newStatus)}
                    />
                  ))}
                  {statusTasks.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No tasks
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

interface CommentsViewProps {
  comments: Comment[]
  setComments: (updater: (comments: Comment[]) => Comment[]) => void
  teamMembers: TeamMember[]
  currentUser: TeamMember
}

const CommentsView = ({ comments, setComments, teamMembers, currentUser }: CommentsViewProps) => {
  const [newComment, setNewComment] = useState('')
  const [selectedService, setSelectedService] = useState('general')

  const addComment = () => {
    if (!newComment.trim()) return

    const comment: Comment = {
      id: `comment-${Date.now()}`,
      authorId: currentUser.id,
      content: newComment,
      timestamp: Date.now(),
      contextType: 'service',
      contextId: selectedService,
      replies: [],
      reactions: [],
      mentions: [],
      isResolved: false
    }

    setComments(current => [...current, comment])
    setNewComment('')
    toast.success('Comment posted')
  }

  const toggleResolve = (commentId: string) => {
    setComments(current =>
      current.map(c => c.id === commentId ? { ...c, isResolved: !c.isResolved } : c)
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Post a Comment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Related to</Label>
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Discussion</SelectItem>
                {services.map(service => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            placeholder="Share your thoughts, feedback, or questions..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
          />
          <Button onClick={addComment} className="gap-2">
            <PaperPlaneTilt size={18} />
            Post Comment
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {comments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ChatCircleDots size={48} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No comments yet. Start the conversation!</p>
            </CardContent>
          </Card>
        ) : (
          [...comments].reverse().map(comment => {
            const author = teamMembers.find(m => m.id === comment.authorId)
            const service = services.find(s => s.id === comment.contextId)
            
            return (
              <Card key={comment.id} className={comment.isResolved ? 'opacity-60' : ''}>
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={author?.avatarUrl} alt={author?.name} />
                      <AvatarFallback>
                        {author?.name.split(' ').map(n => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{author?.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(comment.timestamp).toLocaleString()} · {service?.name || 'General'}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleResolve(comment.id)}
                          className="gap-1"
                        >
                          <CheckCircle size={16} weight={comment.isResolved ? 'fill' : 'regular'} />
                          {comment.isResolved ? 'Resolved' : 'Resolve'}
                        </Button>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}

interface TeamViewProps {
  teamMembers: TeamMember[]
  tasks: Task[]
  comments: Comment[]
}

const TeamView = ({ teamMembers, tasks, comments }: TeamViewProps) => {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {teamMembers.map(member => {
        const memberTasks = tasks.filter(t => t.assigneeId === member.id)
        const memberComments = comments.filter(c => c.authorId === member.id)
        const activeTasks = memberTasks.filter(t => t.status !== 'done')

        return (
          <Card key={member.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={member.avatarUrl} alt={member.name} />
                    <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  {member.isOnline && (
                    <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-card" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base">{member.name}</CardTitle>
                  <CardDescription className="text-xs">{member.email}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="secondary" className={cn('w-full justify-center', roleColors[member.role])}>
                {member.role}
              </Badge>
              
              <Separator />
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Active Tasks</span>
                  <span className="font-semibold">{activeTasks.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Comments</span>
                  <span className="font-semibold">{memberComments.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={member.isOnline ? 'default' : 'secondary'} className="text-xs">
                    {member.isOnline ? 'Online' : 'Offline'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

interface TaskCardProps {
  task: Task
  onClick: () => void
  compact?: boolean
  onStatusChange?: (status: Task['status']) => void
}

const TaskCard = ({ task, onClick, compact = false, onStatusChange }: TaskCardProps) => {
  const assignee = mockTeamMembers.find(m => m.id === task.assigneeId)

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className={compact ? 'pt-4' : 'pt-6'}>
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
            <FlagBanner size={16} weight="fill" className={priorityColors[task.priority]} />
          </div>
          
          {!compact && task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
          )}
          
          <div className="flex items-center justify-between gap-2">
            {assignee ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={assignee.avatarUrl} alt={assignee.name} />
                  <AvatarFallback className="text-xs">
                    {assignee.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">{assignee.name.split(' ')[0]}</span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Unassigned</span>
            )}
            
            {onStatusChange && (
              <Select
                value={task.status}
                onValueChange={(val) => {
                  onStatusChange(val as Task['status'])
                }}
              >
                <SelectTrigger className="h-7 w-28 text-xs" onClick={(e) => e.stopPropagation()}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          
          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {task.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface CommentCardProps {
  comment: Comment
  author?: TeamMember
}

const CommentCard = ({ comment, author }: CommentCardProps) => {
  const service = services.find(s => s.id === comment.contextId)
  
  return (
    <div className="flex gap-3 p-3 rounded-lg border bg-card/50">
      <Avatar className="h-8 w-8">
        <AvatarImage src={author?.avatarUrl} alt={author?.name} />
        <AvatarFallback className="text-xs">
          {author?.name.split(' ').map(n => n[0]).join('') || 'U'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{author?.name || 'Unknown'}</p>
          <span className="text-xs text-muted-foreground">·</span>
          <p className="text-xs text-muted-foreground">
            {new Date(comment.timestamp).toLocaleTimeString()}
          </p>
          {service && (
            <>
              <span className="text-xs text-muted-foreground">·</span>
              <Badge variant="outline" className="text-xs">{service.name}</Badge>
            </>
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{comment.content}</p>
      </div>
    </div>
  )
}

interface CreateTaskDialogProps {
  onClose: () => void
  onCreate: (task: Task) => void
  currentUser: TeamMember
}

const CreateTaskDialog = ({ onClose, onCreate, currentUser }: CreateTaskDialogProps) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Task['priority']>('medium')
  const [assignee, setAssignee] = useState<string>('')
  const [contextType, setContextType] = useState<'service' | 'workflow' | 'general'>('general')
  const [contextId, setContextId] = useState<string>('')

  const handleCreate = () => {
    if (!title.trim()) {
      toast.error('Please enter a task title')
      return
    }

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title,
      description,
      status: 'todo',
      priority,
      assigneeId: assignee || undefined,
      creatorId: currentUser.id,
      contextType,
      contextId: contextId || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [],
      comments: []
    }

    onCreate(newTask)
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create New Task</DialogTitle>
        <DialogDescription>
          Assign work and track progress across the architecture
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 mt-4">
        <div>
          <Label htmlFor="title">Task Title *</Label>
          <Input
            id="title"
            placeholder="e.g., Implement API authentication"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Add details about this task..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority} onValueChange={(val) => setPriority(val as Task['priority'])}>
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="assignee">Assign To</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger id="assignee">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {mockTeamMembers.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="context">Related To (Optional)</Label>
          <Select value={contextId} onValueChange={setContextId}>
            <SelectTrigger id="context">
              <SelectValue placeholder="General task" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">General</SelectItem>
              {services.map(service => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>
            Create Task
          </Button>
        </div>
      </div>
    </>
  )
}

export default CollaborationView

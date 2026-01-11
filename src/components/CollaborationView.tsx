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
import { Switch } from '@/components/ui/switch'
import { motion } from 'framer-motion'
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
  Circle,
  ArrowsDownUp,
  DotsSixVertical,
  ShieldCheck,
  Lock,
  GitBranch,
  Database,
  Sparkle,
  ArrowCounterClockwise
} from '@phosphor-icons/react'
import { mockTeamMembers, Comment, Task, TeamMember, hasPermission, canManageTeam, canEditTask, AccessLevel, ACCESS_LEVEL_PERMISSIONS, Permission } from '@/lib/collaboration-data'
import { services } from '@/lib/architecture-data'
import { taskTemplates } from '@/lib/task-templates'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { DataExport } from '@/lib/data-service'
import { DataManagement } from '@/components/DataManagement'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import CalendarView from '@/components/CalendarView'
import TaskDependenciesDialog from '@/components/TaskDependenciesDialog'
import ActivityTimeline from '@/components/ActivityTimeline'

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

const accessLevelColors = {
  owner: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
  admin: 'bg-blue-500/90 text-white',
  member: 'bg-green-500/90 text-white',
  viewer: 'bg-gray-500/90 text-white'
}

const accessLevelIcons = {
  owner: '👑',
  admin: '⚡',
  member: '✓',
  viewer: '👁️'
}

const CollaborationView = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [comments, setComments] = useKV<Comment[]>('collaboration-comments', [])
  const [tasks, setTasks] = useKV<Task[]>('collaboration-tasks', [])
  const [teamMembers, setTeamMembers] = useKV<TeamMember[]>('team-members', mockTeamMembers)
  const [newCommentText, setNewCommentText] = useState('')
  const [selectedContext, setSelectedContext] = useState<{ type: string; id: string } | null>(null)
  const [isCreatingTask, setIsCreatingTask] = useState(false)

  const fixTeamMembersData = (members: TeamMember[]): TeamMember[] => {
    let hasFixed = false
    const fixed = members.map(member => {
      if (!member.accessLevel) {
        hasFixed = true
        return {
          ...member,
          accessLevel: 'member' as AccessLevel
        }
      }
      return member
    })
    
    if (hasFixed) {
      setTeamMembers(() => fixed)
      toast.info('Fixed team member data with missing access levels')
    }
    
    return fixed
  }

  const allMembers = teamMembers && teamMembers.length > 0 ? fixTeamMembersData(teamMembers) : mockTeamMembers
  const currentUser = allMembers[0]

  const addComment = (contextType: string, contextId: string) => {
    if (!newCommentText.trim()) return

    if (!hasPermission(currentUser, 'create_comments')) {
      toast.error('You do not have permission to create comments')
      return
    }

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

  const onlineMembers = allMembers.filter(m => m.isOnline)
  const recentComments = (comments || []).slice(-5).reverse()
  const recentTasks = (tasks || [])
    .filter(t => t.status !== 'done')
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5)

  const handleDataRestore = (data: DataExport) => {
    setTasks(() => data.tasks)
    setComments(() => data.comments)
    setTeamMembers(() => data.teamMembers)
  }

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Team Collaboration
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            Coordinate tasks, share feedback, and track progress across the architecture
          </p>
        </div>
        <Dialog open={isCreatingTask} onOpenChange={setIsCreatingTask}>
          <DialogTrigger asChild>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                className="gap-2 shadow-lg hover:shadow-xl transition-all"
                disabled={!hasPermission(currentUser, 'create_tasks')}
              >
                <Plus size={18} weight="bold" />
                <span className="hidden sm:inline">Create Task</span>
              </Button>
            </motion.div>
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
              teamMembers={allMembers}
            />
          </DialogContent>
        </Dialog>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full max-w-4xl h-auto gap-2 bg-muted/50 backdrop-blur-sm p-1.5 rounded-xl shadow-inner">
          <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:scale-105 rounded-lg transition-all">
            <Users size={18} weight="duotone" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:scale-105 rounded-lg transition-all">
            <CheckSquare size={18} weight="duotone" />
            <span className="hidden sm:inline">Tasks</span>
            <Badge variant="secondary" className="ml-1 text-xs shadow-sm">
              {(tasks || []).filter(t => t.status !== 'done').length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:scale-105 rounded-lg transition-all">
            <CalendarBlank size={18} weight="duotone" />
            <span className="hidden sm:inline">Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="comments" className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:scale-105 rounded-lg transition-all">
            <ChatCircleDots size={18} weight="duotone" />
            <span className="hidden sm:inline">Comments</span>
            <Badge variant="secondary" className="ml-1 text-xs shadow-sm">
              {(comments || []).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:scale-105 rounded-lg transition-all">
            <Users size={18} weight="duotone" />
            <span className="hidden sm:inline">Team</span>
            <Badge variant="secondary" className="ml-1 text-xs shadow-sm">
              {allMembers.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-lg data-[state=active]:scale-105 rounded-lg transition-all">
            <Database size={18} weight="duotone" />
            <span className="hidden sm:inline">Data</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck size={20} weight="duotone" className="text-primary" />
                  Your Access Level
                </CardTitle>
                <CardDescription>
                  You are logged in as {currentUser.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-3">
                  <Badge className={cn('text-sm px-3 py-1.5 shadow-md', accessLevelColors[currentUser.accessLevel])}>
                    {accessLevelIcons[currentUser.accessLevel]} {currentUser.accessLevel}
                  </Badge>
                  <Badge variant="secondary" className={cn('text-sm px-3 py-1.5 shadow-sm', roleColors[currentUser.role])}>
                    {currentUser.role}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {currentUser.accessLevel === 'owner' && 'You have full system access with all permissions enabled.'}
                  {currentUser.accessLevel === 'admin' && 'You have administrative access to manage team and content.'}
                  {currentUser.accessLevel === 'member' && 'You have standard member access to create and collaborate.'}
                  {currentUser.accessLevel === 'viewer' && 'You have read-only access with commenting ability.'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {currentUser && currentUser.accessLevel && (ACCESS_LEVEL_PERMISSIONS[currentUser.accessLevel] || []).filter(p => p).slice(0, 6).map((permission, idx) => (
                    <Badge key={`${permission}-${idx}`} variant="outline" className="text-xs">
                      {permission.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                  {currentUser && currentUser.accessLevel && (ACCESS_LEVEL_PERMISSIONS[currentUser.accessLevel] || []).filter(p => p).length > 6 && (
                    <Badge variant="outline" className="text-xs">
                      +{(ACCESS_LEVEL_PERMISSIONS[currentUser.accessLevel] || []).filter(p => p).length - 6} more
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users size={20} weight="duotone" className="text-primary" />
                    Team Online
                  </CardTitle>
                  <CardDescription>
                    {onlineMembers.length} of {allMembers.length} members active
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[280px]">
                    <div className="space-y-3 pr-4">
                      {onlineMembers.map(member => (
                        <motion.div 
                          key={member.id} 
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                          whileHover={{ scale: 1.02, x: 4 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="relative">
                            <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm">
                              <AvatarImage src={member.avatarUrl} alt={member.name} />
                              <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-card shadow-sm animate-pulse" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-sm">{member.name}</p>
                              <span className="text-xs">{accessLevelIcons[member.accessLevel]}</span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="secondary" className={cn('text-xs', roleColors[member.role])}>
                              {member.role}
                            </Badge>
                            <Badge variant="outline" className="text-xs capitalize">
                              {member.accessLevel}
                            </Badge>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
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
                    <div className="space-y-3 pr-4">
                      {recentTasks.length === 0 ? (
                        <div className="py-12 text-center">
                          <CheckSquare size={48} className="mx-auto text-muted-foreground/50 mb-2" weight="duotone" />
                          <p className="text-sm text-muted-foreground">
                            No active tasks yet
                          </p>
                        </div>
                      ) : (
                        recentTasks.map(task => (
                          <TaskCard key={task.id} task={task} onClick={() => {}} compact teamMembers={allMembers} />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <ActivityTimeline 
              tasks={tasks || []} 
              comments={comments || []} 
              teamMembers={allMembers} 
            />
          </motion.div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <TasksView
            tasks={tasks || []}
            setTasks={setTasks}
            teamMembers={allMembers}
            currentUser={currentUser}
          />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <CalendarView
            tasks={tasks || []}
            teamMembers={allMembers}
          />
        </TabsContent>

        <TabsContent value="comments" className="space-y-6">
          <CommentsView
            comments={comments || []}
            setComments={setComments}
            teamMembers={allMembers}
            currentUser={currentUser}
          />
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <TeamView 
            teamMembers={allMembers} 
            setTeamMembers={setTeamMembers}
            tasks={tasks || []} 
            comments={comments || []} 
          />
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <DataManagement
            tasks={tasks || []}
            comments={comments || []}
            teamMembers={allMembers}
            onDataRestore={handleDataRestore}
          />
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

const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }

const TasksView = ({ tasks, setTasks, teamMembers, currentUser }: TasksViewProps) => {
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterAssignee, setFilterAssignee] = useState<string>('all')
  const [filterDueDate, setFilterDueDate] = useState<string>('all')
  const [sortByPriority, setSortByPriority] = useKV<boolean>('tasks-sort-by-priority', false)
  const [taskOrder, setTaskOrder] = useKV<Record<string, string[]>>('tasks-custom-order', {})
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dependenciesDialogTask, setDependenciesDialogTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const filteredTasks = tasks.filter(task => {
    if (filterStatus !== 'all' && task.status !== filterStatus) return false
    if (filterPriority !== 'all' && task.priority !== filterPriority) return false
    if (filterAssignee !== 'all') {
      if (filterAssignee === 'unassigned' && task.assigneeId) return false
      if (filterAssignee !== 'unassigned' && task.assigneeId !== filterAssignee) return false
    }
    if (filterDueDate !== 'all') {
      const now = Date.now()
      const oneDayMs = 24 * 60 * 60 * 1000
      const oneWeekMs = 7 * oneDayMs
      
      if (filterDueDate === 'overdue') {
        if (!task.dueDate || task.dueDate >= now) return false
      } else if (filterDueDate === 'today') {
        if (!task.dueDate || task.dueDate < now || task.dueDate > now + oneDayMs) return false
      } else if (filterDueDate === 'this-week') {
        if (!task.dueDate || task.dueDate < now || task.dueDate > now + oneWeekMs) return false
      } else if (filterDueDate === 'no-due-date') {
        if (task.dueDate) return false
      }
    }
    return true
  })

  const sortTasks = (statusTasks: Task[], status: string) => {
    if (sortByPriority) {
      return [...statusTasks].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    }
    
    const order = (taskOrder || {})[status]
    if (!order) return statusTasks
    
    const orderedTasks = [...statusTasks].sort((a, b) => {
      const indexA = order.indexOf(a.id)
      const indexB = order.indexOf(b.id)
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    })
    
    return orderedTasks
  }

  const updateTaskStatus = (taskId: string, newStatus: Task['status']) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    if (!canEditTask(currentUser, task)) {
      toast.error('You do not have permission to edit this task')
      return
    }

    setTasks(current => 
      current.map(t => t.id === taskId ? { ...t, status: newStatus, updatedAt: Date.now() } : t)
    )
    toast.success('Task updated')
  }

  const updateTaskDependencies = (taskId: string, dependencies: string[]) => {
    setTasks(current =>
      current.map(t => t.id === taskId ? { ...t, dependencies, updatedAt: Date.now() } : t)
    )
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const activeTask = tasks.find(t => t.id === active.id)
    if (!activeTask) return

    const status = activeTask.status
    const statusTasks = filteredTasks.filter(t => t.status === status)
    const oldIndex = statusTasks.findIndex(t => t.id === active.id)
    const newIndex = statusTasks.findIndex(t => t.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const reorderedTasks = arrayMove(statusTasks, oldIndex, newIndex)
    const newOrder = reorderedTasks.map(t => t.id)

    setTaskOrder(current => ({
      ...(current || {}),
      [status]: newOrder
    }))

    toast.success('Task reordered')
  }

  const tasksByStatus = {
    todo: sortTasks(filteredTasks.filter(t => t.status === 'todo'), 'todo'),
    'in-progress': sortTasks(filteredTasks.filter(t => t.status === 'in-progress'), 'in-progress'),
    review: sortTasks(filteredTasks.filter(t => t.status === 'review'), 'review'),
    done: sortTasks(filteredTasks.filter(t => t.status === 'done'), 'done')
  }

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-xl shadow-inner">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 shadow-sm hover:shadow-md transition-shadow">
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
          <SelectTrigger className="w-40 shadow-sm hover:shadow-md transition-shadow">
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

        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="w-40 shadow-sm hover:shadow-md transition-shadow">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {teamMembers.map(member => (
              <SelectItem key={member.id} value={member.id}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterDueDate} onValueChange={setFilterDueDate}>
          <SelectTrigger className="w-40 shadow-sm hover:shadow-md transition-shadow">
            <SelectValue placeholder="Due Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Dates</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="today">Due Today</SelectItem>
            <SelectItem value="this-week">This Week</SelectItem>
            <SelectItem value="no-due-date">No Due Date</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 ml-auto border rounded-lg px-4 py-2.5 bg-card shadow-sm hover:shadow-md transition-shadow">
          <ArrowsDownUp size={16} className="text-muted-foreground" />
          <Label htmlFor="priority-sort" className="text-sm cursor-pointer font-medium">
            Sort by Priority
          </Label>
          <Switch
            id="priority-sort"
            checked={sortByPriority || false}
            onCheckedChange={(checked) => {
              setSortByPriority(checked)
              if (checked) {
                toast.info('Sorting by priority (drag-and-drop disabled)')
              } else {
                toast.info('Custom order enabled (drag to reorder)')
              }
            }}
          />
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid lg:grid-cols-4 gap-4">
          {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
            <Card key={status} className="bg-muted/30 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold capitalize flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {status === 'todo' && <Circle size={16} weight="bold" className="text-gray-500" />}
                    {status === 'in-progress' && <ArrowRight size={16} weight="bold" className="text-blue-500" />}
                    {status === 'review' && <Clock size={16} weight="bold" className="text-purple-500" />}
                    {status === 'done' && <CheckCircle size={16} weight="fill" className="text-green-500" />}
                    {status.replace('-', ' ')}
                  </span>
                  <Badge variant="secondary" className="text-xs font-bold shadow-sm">
                    {statusTasks.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <SortableContext
                    items={statusTasks.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                    disabled={sortByPriority || false}
                  >
                    <div className="space-y-3">
                      {statusTasks.map(task => (
                        <SortableTaskCard
                          key={task.id}
                          task={task}
                          onClick={() => setDependenciesDialogTask(task)}
                          onStatusChange={(newStatus) => updateTaskStatus(task.id, newStatus)}
                          isDraggable={!sortByPriority}
                          teamMembers={teamMembers}
                          allTasks={tasks}
                        />
                      ))}
                      {statusTasks.length === 0 && (
                        <div className="text-sm text-muted-foreground text-center py-12 border-2 border-dashed border-muted rounded-lg">
                          <p className="font-medium">No tasks</p>
                          <p className="text-xs mt-1">Drag tasks here</p>
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </ScrollArea>
              </CardContent>
            </Card>
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="opacity-80">
              <TaskCard
                task={activeTask}
                onClick={() => {}}
                isDragging
                teamMembers={teamMembers}
                allTasks={tasks}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Dialog open={!!dependenciesDialogTask} onOpenChange={(open) => !open && setDependenciesDialogTask(null)}>
        {dependenciesDialogTask && (
          <TaskDependenciesDialog
            task={dependenciesDialogTask}
            allTasks={tasks}
            teamMembers={teamMembers}
            onUpdate={updateTaskDependencies}
            onClose={() => setDependenciesDialogTask(null)}
          />
        )}
      </Dialog>
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

    if (!hasPermission(currentUser, 'create_comments')) {
      toast.error('You do not have permission to create comments')
      return
    }

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
    const comment = comments.find(c => c.id === commentId)
    if (comment && comment.authorId !== currentUser.id && !hasPermission(currentUser, 'delete_comments')) {
      toast.error('You can only resolve your own comments')
      return
    }

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
                {(services || []).map(service => (
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
            const service = (services || []).find(s => s.id === comment.contextId)
            
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
  setTeamMembers: (updater: (members: TeamMember[]) => TeamMember[]) => void
  tasks: Task[]
  comments: Comment[]
}

const TeamView = ({ teamMembers, setTeamMembers, tasks, comments }: TeamViewProps) => {
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)

  const currentUser = teamMembers && teamMembers.length > 0 ? teamMembers[0] : mockTeamMembers[0]

  if (!currentUser) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Unable to load team data</p>
        </CardContent>
      </Card>
    )
  }

  const handleDeleteMember = (memberId: string) => {
    if (!canManageTeam(currentUser)) {
      toast.error('You do not have permission to delete team members')
      return
    }
    setTeamMembers(current => current.filter(m => m.id !== memberId))
    toast.success('Team member removed')
  }

  const handleToggleOnline = (memberId: string) => {
    setTeamMembers(current =>
      current.map(m => m.id === memberId ? { ...m, isOnline: !m.isOnline } : m)
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Team Members & Permissions</h3>
          <p className="text-sm text-muted-foreground">
            Manage your team, assign roles, and control access levels
          </p>
        </div>
        <Dialog open={isAddingMember} onOpenChange={setIsAddingMember}>
          <DialogTrigger asChild>
            <Button 
              className="gap-2"
              disabled={!canManageTeam(currentUser)}
            >
              <Plus size={18} />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <AddEditMemberDialog
              onClose={() => setIsAddingMember(false)}
              onSave={(member) => {
                setTeamMembers(current => [...current, member])
                setIsAddingMember(false)
                toast.success('Team member added')
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teamMembers.map(member => {
          const memberTasks = tasks.filter(t => t.assigneeId === member.id)
          const memberComments = comments.filter(c => c.authorId === member.id)
          const activeTasks = memberTasks.filter(t => t.status !== 'done')

          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              whileHover={{ scale: 1.02 }}
            >
              <Card className="relative overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
                <div className={cn(
                  "absolute top-0 right-0 w-32 h-32 opacity-10 blur-3xl rounded-full",
                  member.accessLevel === 'owner' && "bg-purple-500",
                  member.accessLevel === 'admin' && "bg-blue-500",
                  member.accessLevel === 'member' && "bg-green-500",
                  member.accessLevel === 'viewer' && "bg-gray-500"
                )} />
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12 ring-2 ring-background shadow-md">
                        <AvatarImage src={member.avatarUrl} alt={member.name} />
                        <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      {member.isOnline && (
                        <div className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-card shadow-sm" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{member.name}</CardTitle>
                        <span className="text-sm">{accessLevelIcons[member.accessLevel]}</span>
                      </div>
                      <CardDescription className="text-xs truncate">{member.email}</CardDescription>
                    </div>
                    <Dialog open={editingMember?.id === member.id} onOpenChange={(open) => !open && setEditingMember(null)}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 hover:bg-muted/50 transition-colors"
                          onClick={() => setEditingMember(member)}
                          disabled={!canManageTeam(currentUser) && currentUser.id !== member.id}
                        >
                          <DotsThree size={18} weight="bold" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-xl">
                        <AddEditMemberDialog
                          member={member}
                          onClose={() => setEditingMember(null)}
                          onSave={(updatedMember) => {
                            setTeamMembers(current =>
                              current.map(m => m.id === member.id ? updatedMember : m)
                            )
                            setEditingMember(null)
                            toast.success('Team member updated')
                          }}
                          onDelete={() => {
                            handleDeleteMember(member.id)
                            setEditingMember(null)
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Badge variant="secondary" className={cn('flex-1 justify-center shadow-sm', roleColors[member.role])}>
                      {member.role}
                    </Badge>
                    <Badge className={cn('flex-1 justify-center shadow-md', accessLevelColors[member.accessLevel])}>
                      {member.accessLevel}
                    </Badge>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Active Tasks</span>
                      <Badge variant="outline" className="font-semibold shadow-sm">{activeTasks.length}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Comments</span>
                      <Badge variant="outline" className="font-semibold shadow-sm">{memberComments.length}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Status</span>
                      <Button
                        variant={member.isOnline ? 'default' : 'secondary'}
                        size="sm"
                        className="h-6 text-xs shadow-sm"
                        onClick={() => handleToggleOnline(member.id)}
                      >
                        {member.isOnline ? 'Online' : 'Offline'}
                      </Button>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 shadow-sm hover:shadow-md transition-shadow"
                    onClick={() => setSelectedMember(member)}
                  >
                    <ShieldCheck size={16} weight="duotone" />
                    View Permissions
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent className="max-w-2xl">
          {selectedMember && (
            <PermissionsDetailsDialog
              member={selectedMember}
              onClose={() => setSelectedMember(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface TaskCardProps {
  task: Task
  onClick: () => void
  compact?: boolean
  onStatusChange?: (status: Task['status']) => void
  isDraggable?: boolean
  isDragging?: boolean
  teamMembers?: TeamMember[]
  allTasks?: Task[]
}

const TaskCard = ({ task, onClick, compact = false, onStatusChange, isDraggable = false, isDragging = false, teamMembers = mockTeamMembers, allTasks = [] }: TaskCardProps) => {
  const assignee = teamMembers.find(m => m.id === task.assigneeId)
  
  const getDueDateInfo = () => {
    if (!task.dueDate) return null
    
    const now = Date.now()
    const dueDate = new Date(task.dueDate)
    const isOverdue = task.dueDate < now
    const daysUntilDue = Math.ceil((task.dueDate - now) / (1000 * 60 * 60 * 24))
    
    return { dueDate, isOverdue, daysUntilDue }
  }
  
  const dueDateInfo = getDueDateInfo()

  const dependencies = (task.dependencies || []).length
  const blockedByIncomplete = allTasks
    .filter(t => (task.dependencies || []).includes(t.id))
    .some(t => t.status !== 'done')

  const priorityBorder = {
    low: 'border-l-4 border-l-blue-500',
    medium: 'border-l-4 border-l-yellow-500',
    high: 'border-l-4 border-l-orange-500',
    critical: 'border-l-4 border-l-red-500'
  }

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden",
        isDragging && "opacity-50 cursor-grabbing shadow-2xl scale-105",
        blockedByIncomplete && "border-orange-500/50 bg-orange-50/5 dark:bg-orange-950/20",
        priorityBorder[task.priority]
      )} 
      onClick={onClick}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/5 to-accent/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <CardContent className={compact ? 'pt-4 relative' : 'pt-6 relative'}>
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              {isDraggable && (
                <DotsSixVertical size={18} weight="bold" className="text-muted-foreground mt-0.5 cursor-grab flex-shrink-0 hover:text-foreground transition-colors opacity-0 group-hover:opacity-100" />
              )}
              <h4 className="font-semibold text-sm line-clamp-2 leading-snug">{task.title}</h4>
            </div>
            <div className="flex items-center gap-1.5">
              {dependencies > 0 && (
                <Badge variant="outline" className="text-xs gap-1 shadow-sm">
                  <GitBranch size={12} weight="bold" />
                  {dependencies}
                </Badge>
              )}
              <FlagBanner size={20} weight="fill" className={cn(priorityColors[task.priority], "flex-shrink-0 drop-shadow-md")} />
            </div>
          </div>
          
          {!compact && task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{task.description}</p>
          )}

          {blockedByIncomplete && (
            <div className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 bg-orange-100/50 dark:bg-orange-900/20 px-2.5 py-1.5 rounded-md font-medium">
              <GitBranch size={12} weight="bold" />
              <span>Blocked by dependencies</span>
            </div>
          )}
          
          {dueDateInfo && (
            <div className={cn(
              "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md w-fit",
              dueDateInfo.isOverdue ? "text-red-600 dark:text-red-400 bg-red-100/50 dark:bg-red-900/20" : 
              dueDateInfo.daysUntilDue <= 1 ? "text-orange-600 dark:text-orange-400 bg-orange-100/50 dark:bg-orange-900/20" : 
              dueDateInfo.daysUntilDue <= 3 ? "text-yellow-600 dark:text-yellow-400 bg-yellow-100/50 dark:bg-yellow-900/20" : "text-muted-foreground bg-muted/50"
            )}>
              <CalendarBlank size={14} weight="bold" />
              <span>
                {dueDateInfo.isOverdue ? 'Overdue' : 
                 dueDateInfo.daysUntilDue === 0 ? 'Due today' :
                 dueDateInfo.daysUntilDue === 1 ? 'Due tomorrow' :
                 `Due in ${dueDateInfo.daysUntilDue} days`}
              </span>
              <span className="text-muted-foreground">· {dueDateInfo.dueDate.toLocaleDateString()}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between gap-2 pt-1">
            {assignee ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7 ring-2 ring-background shadow-sm">
                  <AvatarImage src={assignee.avatarUrl} alt={assignee.name} />
                  <AvatarFallback className="text-xs">
                    {assignee.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium text-muted-foreground">{assignee.name.split(' ')[0]}</span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Users size={14} />
                Unassigned
              </span>
            )}
            
            {onStatusChange && (
              <Select
                value={task.status}
                onValueChange={(val) => {
                  onStatusChange(val as Task['status'])
                }}
              >
                <SelectTrigger className="h-8 w-32 text-xs shadow-sm" onClick={(e) => e.stopPropagation()}>
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
          
          {(task.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(task.tags || []).slice(0, 3).map(tag => (
                <Badge key={tag} variant="outline" className="text-xs shadow-sm">
                  {tag}
                </Badge>
              ))}
              {(task.tags || []).length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{(task.tags || []).length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface SortableTaskCardProps {
  task: Task
  onClick: () => void
  onStatusChange?: (status: Task['status']) => void
  isDraggable?: boolean
  teamMembers?: TeamMember[]
  allTasks?: Task[]
}

const SortableTaskCard = ({ task, onClick, onStatusChange, isDraggable = true, teamMembers, allTasks = [] }: SortableTaskCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: !isDraggable })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard
        task={task}
        onClick={onClick}
        onStatusChange={onStatusChange}
        isDraggable={isDraggable}
        isDragging={isDragging}
        teamMembers={teamMembers}
        allTasks={allTasks}
      />
    </div>
  )
}

interface CommentCardProps {
  comment: Comment
  author?: TeamMember
}

const CommentCard = ({ comment, author }: CommentCardProps) => {
  const service = (services || []).find(s => s.id === comment.contextId)
  
  return (
    <motion.div 
      className="flex gap-3 p-3 rounded-lg border bg-card shadow-sm hover:shadow-md transition-all duration-300"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
    >
      <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm">
        <AvatarImage src={author?.avatarUrl} alt={author?.name} />
        <AvatarFallback className="text-xs">
          {author?.name.split(' ').map(n => n[0]).join('') || 'U'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm">{author?.name || 'Unknown'}</p>
          <span className="text-xs text-muted-foreground">·</span>
          <p className="text-xs text-muted-foreground">
            {new Date(comment.timestamp).toLocaleTimeString()}
          </p>
          {service && (
            <>
              <span className="text-xs text-muted-foreground">·</span>
              <Badge variant="outline" className="text-xs shadow-sm">{service.name}</Badge>
            </>
          )}
        </div>
        <p className="text-sm text-foreground line-clamp-2">{comment.content}</p>
      </div>
    </motion.div>
  )
}

interface CreateTaskDialogProps {
  onClose: () => void
  onCreate: (task: Task) => void
  currentUser: TeamMember
  teamMembers: TeamMember[]
}

const CreateTaskDialog = ({ onClose, onCreate, currentUser, teamMembers }: CreateTaskDialogProps) => {
  const [showTemplates, setShowTemplates] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Task['priority']>('medium')
  const [assignee, setAssignee] = useState<string>('unassigned')
  const [contextType, setContextType] = useState<'service' | 'workflow' | 'general'>('general')
  const [contextId, setContextId] = useState<string>('general')
  const [dueDate, setDueDate] = useState<string>('')
  const [tags, setTags] = useState<string>('')
  const [templateCategory, setTemplateCategory] = useState('all')

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
      assigneeId: assignee === 'unassigned' ? undefined : assignee,
      creatorId: currentUser.id,
      contextType,
      contextId: contextId === 'general' ? undefined : contextId,
      dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      comments: []
    }

    onCreate(newTask)
  }

  const handleTemplateSelect = (templateId: string) => {
    const template = taskTemplates.find(t => t.id === templateId)
    if (!template) return

    setSelectedTemplate(templateId)
    setTitle(template.defaultTitle)
    setDescription(template.defaultDescription)
    setPriority(template.defaultPriority)
    setTags(template.defaultTags.join(', '))
    if (template.suggestedDueDays) {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + template.suggestedDueDays)
      setDueDate(dueDate.toISOString().split('T')[0])
    }
    setShowTemplates(false)
    toast.success(`Applied "${template.name}" template`)
  }

  const handleStartFromScratch = () => {
    setShowTemplates(false)
  }

  const handleResetTemplate = () => {
    setShowTemplates(true)
    setSelectedTemplate(null)
    setTitle('')
    setDescription('')
    setPriority('medium')
    setTags('')
    setDueDate('')
  }

  const filteredTemplates = taskTemplates.filter(t => 
    templateCategory === 'all' || t.category === templateCategory
  )

  const selectedAssignee = teamMembers.find(m => m.id === assignee)

  const priorityIcons = {
    low: <FlagBanner size={16} weight="fill" className="text-blue-500" />,
    medium: <FlagBanner size={16} weight="fill" className="text-yellow-500" />,
    high: <FlagBanner size={16} weight="fill" className="text-orange-500" />,
    critical: <FlagBanner size={16} weight="fill" className="text-red-500" />
  }

  return (
    <>
      <DialogHeader className="space-y-3 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-primary to-accent rounded-xl">
              <Plus size={24} weight="bold" className="text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Create New Task</DialogTitle>
              <DialogDescription className="text-base mt-1">
                {showTemplates ? 'Choose a template or start from scratch' : 'Assign work and track progress across your team'}
              </DialogDescription>
            </div>
          </div>
          {!showTemplates && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetTemplate}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowCounterClockwise size={16} />
              Templates
            </Button>
          )}
        </div>
      </DialogHeader>

      {showTemplates ? (
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-4 mt-2">
            <div className="flex gap-2 flex-wrap">
              {['all', 'development', 'operations', 'design', 'documentation'].map(cat => (
                <Button
                  key={cat}
                  variant={templateCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTemplateCategory(cat)}
                  className="capitalize"
                >
                  {cat === 'all' ? 'All' : cat}
                </Button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {filteredTemplates.map(template => {
                const Icon = template.icon
                return (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      className="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-200"
                      onClick={() => handleTemplateSelect(template.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Icon size={24} weight="duotone" className="text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm mb-1">{template.name}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {template.description}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {template.defaultTags.slice(0, 2).map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>

            <Separator />

            <Button
              variant="outline"
              className="w-full h-14 gap-2 text-base"
              onClick={handleStartFromScratch}
            >
              <Plus size={20} weight="bold" />
              Start from Scratch
            </Button>
          </div>
        </ScrollArea>
      ) : (
        <>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-5 mt-2">
              {selectedTemplate && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center gap-2">
                  <Sparkle size={16} weight="fill" className="text-primary" />
                  <span className="text-sm font-medium text-primary">
                    Using "{taskTemplates.find(t => t.id === selectedTemplate)?.name}" template
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-semibold">Task Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Implement user authentication"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-11 text-base"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Add details, requirements, or context about this task..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  className="resize-none text-base font-mono text-sm"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority" className="text-sm font-semibold flex items-center gap-2">
                    <FlagBanner size={14} weight="duotone" />
                    Priority
                  </Label>
                  <Select value={priority} onValueChange={(val) => setPriority(val as Task['priority'])}>
                    <SelectTrigger id="priority" className="h-11">
                      <div className="flex items-center gap-2">
                        {priorityIcons[priority]}
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">
                        <div className="flex items-center gap-2">
                          <FlagBanner size={16} weight="fill" className="text-blue-500" />
                          <span>Low Priority</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="medium">
                        <div className="flex items-center gap-2">
                          <FlagBanner size={16} weight="fill" className="text-yellow-500" />
                          <span>Medium Priority</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="high">
                        <div className="flex items-center gap-2">
                          <FlagBanner size={16} weight="fill" className="text-orange-500" />
                          <span>High Priority</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="critical">
                        <div className="flex items-center gap-2">
                          <FlagBanner size={16} weight="fill" className="text-red-500" />
                          <span>Critical Priority</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignee" className="text-sm font-semibold flex items-center gap-2">
                    <Users size={14} weight="duotone" />
                    Assign To
                  </Label>
                  <Select value={assignee} onValueChange={setAssignee}>
                    <SelectTrigger id="assignee" className="h-11">
                      <div className="flex items-center gap-2">
                        {selectedAssignee ? (
                          <>
                            <Avatar className="h-5 w-5 ring-1 ring-background">
                              <AvatarImage src={selectedAssignee.avatarUrl} alt={selectedAssignee.name} />
                              <AvatarFallback className="text-xs">
                                {selectedAssignee.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span>{selectedAssignee.name}</span>
                          </>
                        ) : (
                          <SelectValue placeholder="Unassigned" />
                        )}
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                            <Users size={12} className="text-muted-foreground" />
                          </div>
                          <span>Unassigned</span>
                        </div>
                      </SelectItem>
                      {teamMembers.map(member => (
                        <SelectItem key={member.id} value={member.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5 ring-1 ring-background">
                              <AvatarImage src={member.avatarUrl} alt={member.name} />
                              <AvatarFallback className="text-xs">
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span>{member.name}</span>
                            <Badge variant="outline" className="text-xs ml-auto">{member.role}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="due-date" className="text-sm font-semibold flex items-center gap-2">
                  <CalendarBlank size={14} weight="duotone" />
                  Due Date
                </Label>
                <Input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="h-11"
                />
                {dueDate && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock size={12} />
                    Due {new Date(dueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags" className="text-sm font-semibold flex items-center gap-2">
                  <Tag size={14} weight="duotone" />
                  Tags
                </Label>
                <Input
                  id="tags"
                  placeholder="e.g., backend, urgent, bug-fix (comma separated)"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="h-11"
                />
                {tags && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tags.split(',').map(t => t.trim()).filter(Boolean).map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="context" className="text-sm font-semibold">Related To</Label>
                <Select value={contextId} onValueChange={setContextId}>
                  <SelectTrigger id="context" className="h-11">
                    <SelectValue placeholder="General task" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Task</SelectItem>
                    {(services || []).map(service => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </ScrollArea>

          <div className="flex gap-3 justify-end pt-6 border-t mt-6">
            <Button variant="outline" onClick={onClose} className="h-11 px-6">
              Cancel
            </Button>
            <Button onClick={handleCreate} className="h-11 px-6 gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg">
              <CheckCircle size={18} weight="bold" />
              Create Task
            </Button>
          </div>
        </>
      )}
    </>
  )
}

interface AddEditMemberDialogProps {
  member?: TeamMember
  onClose: () => void
  onSave: (member: TeamMember) => void
  onDelete?: () => void
}

const AddEditMemberDialog = ({ member, onClose, onSave, onDelete }: AddEditMemberDialogProps) => {
  const [name, setName] = useState(member?.name || '')
  const [email, setEmail] = useState(member?.email || '')
  const [role, setRole] = useState<TeamMember['role']>(member?.role || 'developer')
  const [accessLevel, setAccessLevel] = useState<AccessLevel>(member?.accessLevel || 'member')
  const [avatarUrl, setAvatarUrl] = useState(member?.avatarUrl || '')
  const [isOnline, setIsOnline] = useState(member?.isOnline ?? true)

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Please enter a name')
      return
    }

    if (!email.trim()) {
      toast.error('Please enter an email')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email')
      return
    }

    const memberData: TeamMember = {
      id: member?.id || `user-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      role,
      accessLevel,
      avatarUrl: avatarUrl.trim() || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      isOnline
    }

    onSave(memberData)
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete()
    }
  }

  const currentPermissions = ACCESS_LEVEL_PERMISSIONS[accessLevel]

  return (
    <>
      <DialogHeader>
        <DialogTitle>{member ? 'Edit Team Member' : 'Add Team Member'}</DialogTitle>
        <DialogDescription>
          {member ? 'Update team member information and permissions' : 'Add a new member to your team with specific access levels'}
        </DialogDescription>
      </DialogHeader>

      <ScrollArea className="max-h-[60vh]">
        <div className="space-y-4 mt-4 pr-4">
          <div>
            <Label htmlFor="member-name">Name *</Label>
            <Input
              id="member-name"
              placeholder="e.g., John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="member-email">Email *</Label>
            <Input
              id="member-email"
              type="email"
              placeholder="e.g., john.doe@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="member-role">Role *</Label>
            <Select value={role} onValueChange={(val) => setRole(val as TeamMember['role'])}>
              <SelectTrigger id="member-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="architect">Architect</SelectItem>
                <SelectItem value="developer">Developer</SelectItem>
                <SelectItem value="devops">DevOps</SelectItem>
                <SelectItem value="product">Product</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="member-access">Access Level *</Label>
            <Select value={accessLevel} onValueChange={(val) => setAccessLevel(val as AccessLevel)}>
              <SelectTrigger id="member-access">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Owner</span>
                    <span className="text-xs text-muted-foreground">Full system access</span>
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Admin</span>
                    <span className="text-xs text-muted-foreground">Manage team and content</span>
                  </div>
                </SelectItem>
                <SelectItem value="member">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Member</span>
                    <span className="text-xs text-muted-foreground">Create and collaborate</span>
                  </div>
                </SelectItem>
                <SelectItem value="viewer">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Viewer</span>
                    <span className="text-xs text-muted-foreground">Read-only with comments</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg p-3 bg-muted/30">
            <p className="text-sm font-medium mb-2">Permissions for {accessLevel} access:</p>
            <div className="space-y-1">
              {(currentPermissions || []).filter(p => p).map((permission, idx) => (
                <div key={`${permission}-${idx}`} className="flex items-center gap-2 text-xs">
                  <CheckCircle size={14} weight="fill" className="text-green-600" />
                  <span className="text-muted-foreground">{permission.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="member-avatar">Avatar URL (Optional)</Label>
            <Input
              id="member-avatar"
              type="url"
              placeholder="https://example.com/avatar.jpg"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty to auto-generate an avatar
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="member-online"
              checked={isOnline}
              onCheckedChange={setIsOnline}
            />
            <Label htmlFor="member-online" className="cursor-pointer">
              Available / Online
            </Label>
          </div>
        </div>
      </ScrollArea>

      <div className="flex gap-2 justify-between pt-4">
        {member && onDelete && (
          <Button variant="destructive" onClick={handleDelete}>
            Delete Member
          </Button>
        )}
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {member ? 'Update' : 'Add'} Member
          </Button>
        </div>
      </div>
    </>
  )
}

interface PermissionsDetailsDialogProps {
  member: TeamMember
  onClose: () => void
}

const PermissionsDetailsDialog = ({ member, onClose }: PermissionsDetailsDialogProps) => {
  const allPermissions: Permission[] = [
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

  const permissionDescriptions: Record<Permission, string> = {
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

  const permissionCategories = {
    'Team Management': ['manage_team', 'manage_roles', 'manage_permissions'] as Permission[],
    'Task Management': ['create_tasks', 'assign_tasks', 'delete_tasks', 'edit_all_tasks'] as Permission[],
    'Collaboration': ['create_comments', 'delete_comments'] as Permission[],
    'Architecture': ['manage_services', 'manage_workflows', 'manage_roadmap'] as Permission[],
    'Data & Analytics': ['view_analytics', 'export_data'] as Permission[]
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <ShieldCheck size={24} weight="duotone" className="text-accent" />
          Permissions for {member.name}
        </DialogTitle>
        <DialogDescription>
          Access level: <span className="font-semibold capitalize">{member.accessLevel}</span>
        </DialogDescription>
      </DialogHeader>

      <ScrollArea className="max-h-[60vh] mt-4">
        <div className="space-y-4 pr-4">
          <Card className={cn('border-2', accessLevelColors[member.accessLevel].replace('text-white', 'border-current'))}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span>{accessLevelIcons[member.accessLevel]}</span>
                <span className="capitalize">{member.accessLevel} Access Level</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {member.accessLevel === 'owner' && 'Full system access with all permissions enabled. Can manage team members, roles, and all system content.'}
                {member.accessLevel === 'admin' && 'Administrative access to manage team and content. Cannot modify owner permissions or access levels.'}
                {member.accessLevel === 'member' && 'Standard team member access. Can create tasks, collaborate, and view analytics.'}
                {member.accessLevel === 'viewer' && 'Read-only access with ability to comment. Cannot create or modify tasks.'}
              </p>
            </CardContent>
          </Card>

          {Object.entries(permissionCategories).map(([category, permissions]) => (
            <div key={category} className="space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Lock size={16} />
                {category}
              </h4>
              <div className="space-y-2">
                {permissions.map((permission, idx) => {
                  const hasAccess = hasPermission(member, permission)
                  return (
                    <div 
                      key={`${permission}-${idx}`}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border",
                        hasAccess ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                      )}
                    >
                      <div className="mt-0.5">
                        {hasAccess ? (
                          <CheckCircle size={18} weight="fill" className="text-green-600" />
                        ) : (
                          <Circle size={18} className="text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium",
                          hasAccess ? "text-green-900" : "text-gray-500"
                        )}>
                          {permission.replace(/_/g, ' ')}
                        </p>
                        <p className={cn(
                          "text-xs",
                          hasAccess ? "text-green-700" : "text-gray-500"
                        )}>
                          {permissionDescriptions[permission]}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {(member.customPermissions || []).length > 0 && (
            <Card className="border-accent">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Tag size={16} />
                  Custom Permissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(member.customPermissions || []).filter(p => p).map((permission, idx) => (
                    <Badge key={`${permission}-${idx}`} variant="secondary" className="text-xs">
                      {permission.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      <div className="flex justify-end gap-2 pt-4">
        <Button onClick={onClose}>Close</Button>
      </div>
    </>
  )
}

export default CollaborationView

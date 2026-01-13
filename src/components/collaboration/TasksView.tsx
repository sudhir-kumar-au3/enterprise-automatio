import { useState, useMemo, Dispatch, SetStateAction } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle,
  Clock,
  ArrowRight,
  Circle,
  ArrowsDownUp,
  FlagBanner,
  MagnifyingGlass,
  X,
  Kanban,
  ListBullets,
  Lightning,
  Warning,
  CalendarBlank,
  TrendUp,
  Target,
  Fire,
  Sparkle,
  CaretDown,
  Plus,
  FunnelSimple
} from '@phosphor-icons/react'
import { Task, TeamMember, canEditTask } from '@/lib/collaboration-data'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import TaskDependenciesDialog from '@/components/TaskDependenciesDialog'
import TaskCard from './TaskCard'
import SortableTaskCard from './SortableTaskCard'
import { priorityOrder } from './constants'

export interface TasksViewProps {
  tasks: Task[]
  setTasks: Dispatch<SetStateAction<Task[]>>
  teamMembers: TeamMember[]
  currentUser: TeamMember
  updateTaskStatusApi: (taskId: string, status: Task['status']) => Promise<{ success: boolean; data?: Task; error?: string }>
  updateTaskApi: (taskId: string, data: Partial<Task>) => Promise<{ success: boolean; data?: Task; error?: string }>
}

// Status configuration with colors and icons
const statusConfig = {
  todo: {
    icon: Circle,
    label: 'To Do',
    gradient: 'from-slate-500 to-gray-500',
    bgGradient: 'from-slate-500/5 to-gray-500/10',
    borderColor: 'border-slate-500/30',
    iconColor: 'text-slate-500',
    headerBg: 'bg-gradient-to-r from-slate-500/10 to-gray-500/5'
  },
  'in-progress': {
    icon: ArrowRight,
    label: 'In Progress',
    gradient: 'from-blue-500 to-cyan-500',
    bgGradient: 'from-blue-500/5 to-cyan-500/10',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-500',
    headerBg: 'bg-gradient-to-r from-blue-500/10 to-cyan-500/5'
  },
  review: {
    icon: Clock,
    label: 'In Review',
    gradient: 'from-purple-500 to-violet-500',
    bgGradient: 'from-purple-500/5 to-violet-500/10',
    borderColor: 'border-purple-500/30',
    iconColor: 'text-purple-500',
    headerBg: 'bg-gradient-to-r from-purple-500/10 to-violet-500/5'
  },
  done: {
    icon: CheckCircle,
    label: 'Completed',
    gradient: 'from-green-500 to-emerald-500',
    bgGradient: 'from-green-500/5 to-emerald-500/10',
    borderColor: 'border-green-500/30',
    iconColor: 'text-green-500',
    headerBg: 'bg-gradient-to-r from-green-500/10 to-emerald-500/5'
  }
}

const TasksView = ({ tasks, setTasks, teamMembers, currentUser, updateTaskStatusApi, updateTaskApi }: TasksViewProps) => {
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterAssignee, setFilterAssignee] = useState<string>('all')
  const [filterDueDate, setFilterDueDate] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortByPriority, setSortByPriority] = useState<boolean>(false)
  const [taskOrder, setTaskOrder] = useState<Record<string, string[]>>({})
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dependenciesDialogTask, setDependenciesDialogTask] = useState<Task | null>(null)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')

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

  // Calculate stats
  const stats = useMemo(() => {
    const now = Date.now()
    const total = tasks.length
    const completed = tasks.filter(t => t.status === 'done').length
    const inProgress = tasks.filter(t => t.status === 'in-progress').length
    const overdue = tasks.filter(t => t.dueDate && t.dueDate < now && t.status !== 'done').length
    const critical = tasks.filter(t => t.priority === 'critical' && t.status !== 'done').length
    const dueToday = tasks.filter(t => {
      if (!t.dueDate || t.status === 'done') return false
      const today = new Date()
      const due = new Date(t.dueDate)
      return due.toDateString() === today.toDateString()
    }).length

    return { total, completed, inProgress, overdue, critical, dueToday, completionRate: total ? Math.round((completed / total) * 100) : 0 }
  }, [tasks])

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!task.title.toLowerCase().includes(query) && 
            !(task.description || '').toLowerCase().includes(query) &&
            !(task.tags || []).some(t => t.toLowerCase().includes(query))) {
          return false
        }
      }
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
  }, [tasks, searchQuery, filterStatus, filterPriority, filterAssignee, filterDueDate])

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

  const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    if (!canEditTask(currentUser, task)) {
      toast.error('You do not have permission to edit this task')
      return
    }

    try {
      const result = await updateTaskStatusApi(taskId, newStatus)
      if (result.success && result.data) {
        setTasks(current => 
          current.map(t => t.id === taskId ? { ...t, status: newStatus, updatedAt: Date.now() } : t)
        )
        toast.success('Task status updated successfully')
      } else {
        toast.error(result.error || 'Failed to update task status')
      }
    } catch (error) {
      toast.error('Failed to update task status')
    }
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

  const hasActiveFilters = searchQuery || filterStatus !== 'all' || filterPriority !== 'all' || filterAssignee !== 'all' || filterDueDate !== 'all'

  const clearAllFilters = () => {
    setSearchQuery('')
    setFilterStatus('all')
    setFilterPriority('all')
    setFilterAssignee('all')
    setFilterDueDate('all')
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <Kanban size={26} weight="fill" className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Task Board</h3>
              <p className="text-sm text-muted-foreground">
                {filteredTasks.length} of {tasks.length} tasks • {stats.completionRate}% complete
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-3">
            {stats.critical > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                    <Fire size={16} weight="fill" className="text-red-500" />
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">{stats.critical}</span>
                    <span className="text-xs text-red-600/70 dark:text-red-400/70 hidden sm:inline">Critical</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Critical priority tasks</TooltipContent>
              </Tooltip>
            )}
            {stats.overdue > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <Warning size={16} weight="fill" className="text-orange-500" />
                    <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">{stats.overdue}</span>
                    <span className="text-xs text-orange-600/70 dark:text-orange-400/70 hidden sm:inline">Overdue</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Overdue tasks</TooltipContent>
              </Tooltip>
            )}
            {stats.dueToday > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <CalendarBlank size={16} weight="fill" className="text-amber-500" />
                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{stats.dueToday}</span>
                    <span className="text-xs text-amber-600/70 dark:text-amber-400/70 hidden sm:inline">Due Today</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Tasks due today</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-slate-500/10 to-gray-500/10 border-slate-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">To Do</p>
                  <p className="text-2xl font-bold">{tasksByStatus.todo.length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-slate-500/20 flex items-center justify-center">
                  <Circle size={20} weight="bold" className="text-slate-600" />
                </div>
              </div>
              <Progress value={(tasksByStatus.todo.length / Math.max(tasks.length, 1)) * 100} className="h-1.5 mt-3 bg-slate-500/20" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{tasksByStatus['in-progress'].length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Lightning size={20} weight="fill" className="text-blue-600" />
                </div>
              </div>
              <Progress value={(tasksByStatus['in-progress'].length / Math.max(tasks.length, 1)) * 100} className="h-1.5 mt-3 bg-blue-500/20" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">In Review</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{tasksByStatus.review.length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Clock size={20} weight="bold" className="text-purple-600" />
                </div>
              </div>
              <Progress value={(tasksByStatus.review.length / Math.max(tasks.length, 1)) * 100} className="h-1.5 mt-3 bg-purple-500/20" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Completed</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{tasksByStatus.done.length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CheckCircle size={20} weight="fill" className="text-green-600" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Progress value={stats.completionRate} className="h-1.5 flex-1 bg-green-500/20" />
                <span className="text-xs font-medium text-green-600">{stats.completionRate}%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search tasks by title, description, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchQuery('')}
                  >
                    <X size={14} />
                  </Button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="todo">
                      <div className="flex items-center gap-2">
                        <Circle size={12} weight="bold" className="text-slate-500" />
                        To Do
                      </div>
                    </SelectItem>
                    <SelectItem value="in-progress">
                      <div className="flex items-center gap-2">
                        <ArrowRight size={12} weight="bold" className="text-blue-500" />
                        In Progress
                      </div>
                    </SelectItem>
                    <SelectItem value="review">
                      <div className="flex items-center gap-2">
                        <Clock size={12} weight="bold" className="text-purple-500" />
                        Review
                      </div>
                    </SelectItem>
                    <SelectItem value="done">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={12} weight="fill" className="text-green-500" />
                        Done
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="critical">
                      <div className="flex items-center gap-2">
                        <FlagBanner size={12} weight="fill" className="text-red-500" />
                        Critical
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center gap-2">
                        <FlagBanner size={12} weight="fill" className="text-orange-500" />
                        High
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <FlagBanner size={12} weight="fill" className="text-yellow-500" />
                        Medium
                      </div>
                    </SelectItem>
                    <SelectItem value="low">
                      <div className="flex items-center gap-2">
                        <FlagBanner size={12} weight="fill" className="text-blue-500" />
                        Low
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                  <SelectTrigger className="w-36">
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
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Due Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="overdue">
                      <div className="flex items-center gap-2 text-red-500">
                        <Warning size={12} weight="fill" />
                        Overdue
                      </div>
                    </SelectItem>
                    <SelectItem value="today">Due Today</SelectItem>
                    <SelectItem value="this-week">This Week</SelectItem>
                    <SelectItem value="no-due-date">No Due Date</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2 ml-auto">
                  {/* Sort Toggle */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5 bg-background">
                        <ArrowsDownUp size={14} className={cn("transition-colors", sortByPriority ? "text-primary" : "text-muted-foreground")} />
                        <Label htmlFor="priority-sort" className="text-xs cursor-pointer whitespace-nowrap">
                          Priority Sort
                        </Label>
                        <Switch
                          id="priority-sort"
                          checked={sortByPriority || false}
                          onCheckedChange={(checked) => {
                            setSortByPriority(checked)
                            toast.info(checked ? 'Sorting by priority' : 'Custom order enabled')
                          }}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Sort tasks by priority level</TooltipContent>
                  </Tooltip>

                  {/* View Toggle */}
                  <div className="flex items-center border rounded-lg p-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setViewMode('kanban')}
                        >
                          <Kanban size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Kanban view</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setViewMode('list')}
                        >
                          <ListBullets size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>List view</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Filters */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                <FunnelSimple size={14} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Active filters:</span>
                {searchQuery && (
                  <Badge variant="secondary" className="gap-1 h-6">
                    Search: "{searchQuery}"
                    <X size={12} className="cursor-pointer hover:text-destructive" onClick={() => setSearchQuery('')} />
                  </Badge>
                )}
                {filterStatus !== 'all' && (
                  <Badge variant="secondary" className="gap-1 h-6 capitalize">
                    {filterStatus.replace('-', ' ')}
                    <X size={12} className="cursor-pointer hover:text-destructive" onClick={() => setFilterStatus('all')} />
                  </Badge>
                )}
                {filterPriority !== 'all' && (
                  <Badge variant="secondary" className="gap-1 h-6 capitalize">
                    {filterPriority}
                    <X size={12} className="cursor-pointer hover:text-destructive" onClick={() => setFilterPriority('all')} />
                  </Badge>
                )}
                {filterAssignee !== 'all' && (
                  <Badge variant="secondary" className="gap-1 h-6">
                    {filterAssignee === 'unassigned' ? 'Unassigned' : teamMembers.find(m => m.id === filterAssignee)?.name || filterAssignee}
                    <X size={12} className="cursor-pointer hover:text-destructive" onClick={() => setFilterAssignee('all')} />
                  </Badge>
                )}
                {filterDueDate !== 'all' && (
                  <Badge variant="secondary" className="gap-1 h-6 capitalize">
                    {filterDueDate.replace('-', ' ')}
                    <X size={12} className="cursor-pointer hover:text-destructive" onClick={() => setFilterDueDate('all')} />
                  </Badge>
                )}
                <Button variant="ghost" size="sm" className="h-6 text-xs ml-auto" onClick={clearAllFilters}>
                  Clear all
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {filteredTasks.length} of {tasks.length} tasks
          </span>
          {!sortByPriority && (
            <span className="text-xs">
              <Sparkle size={12} className="inline mr-1" />
              Drag to reorder tasks within columns
            </span>
          )}
        </div>

        {/* Kanban Board */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {viewMode === 'kanban' ? (
            <div className="grid lg:grid-cols-4 gap-4">
              {(Object.entries(tasksByStatus) as [Task['status'], Task[]][]).map(([status, statusTasks]) => {
                const config = statusConfig[status]
                const StatusIcon = config.icon

                return (
                  <Card key={status} className={cn("overflow-hidden", config.borderColor, "border")}>
                    {/* Column Header */}
                    <CardHeader className={cn("pb-3", config.headerBg)}>
                      <CardTitle className="text-sm font-medium flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", `bg-gradient-to-br ${config.gradient}`)}>
                            <StatusIcon size={14} weight={status === 'done' ? 'fill' : 'bold'} className="text-white" />
                          </div>
                          <span>{config.label}</span>
                        </span>
                        <Badge variant="secondary" className="text-xs font-semibold">
                          {statusTasks.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    
                    {/* Column Content */}
                    <CardContent className={cn("pt-0", `bg-gradient-to-b ${config.bgGradient}`)}>
                      <ScrollArea className="h-[550px] pr-2">
                        <SortableContext
                          items={statusTasks.map(t => t.id)}
                          strategy={verticalListSortingStrategy}
                          disabled={sortByPriority || false}
                        >
                          <div className="space-y-3 py-2">
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
                              <div className={cn(
                                "text-center py-12 border-2 border-dashed rounded-xl transition-colors",
                                config.borderColor,
                                "hover:border-primary/30"
                              )}>
                                <div className={cn("h-12 w-12 rounded-xl mx-auto mb-3 flex items-center justify-center", `bg-gradient-to-br ${config.gradient}/20`)}>
                                  <StatusIcon size={24} className={config.iconColor} />
                                </div>
                                <p className="font-medium text-sm">No tasks</p>
                                <p className="text-xs text-muted-foreground mt-1">Drag tasks here or create new ones</p>
                              </div>
                            )}
                          </div>
                        </SortableContext>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            /* List View */
            <Card>
              <ScrollArea className="h-[600px]">
                <div className="divide-y">
                  {filteredTasks.length === 0 ? (
                    <div className="py-16 text-center">
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center mx-auto mb-4">
                        <Kanban size={32} className="text-blue-500" />
                      </div>
                      <p className="font-medium text-lg mb-1">No tasks found</p>
                      <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
                    </div>
                  ) : (
                    filteredTasks.map(task => (
                      <div
                        key={task.id}
                        className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => setDependenciesDialogTask(task)}
                      >
                        <TaskCard
                          task={task}
                          onClick={() => setDependenciesDialogTask(task)}
                          onStatusChange={(newStatus) => updateTaskStatus(task.id, newStatus)}
                          teamMembers={teamMembers}
                          allTasks={tasks}
                          compact={false}
                        />
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>
          )}

          <DragOverlay>
            {activeTask ? (
              <div className="opacity-90 rotate-2 scale-105">
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

        {/* Task Dependencies Dialog */}
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
    </TooltipProvider>
  )
}

export default TasksView

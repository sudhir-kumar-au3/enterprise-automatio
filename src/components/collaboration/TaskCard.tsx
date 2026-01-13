import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { 
  Users, 
  CalendarBlank,
  FlagBanner,
  DotsSixVertical,
  GitBranch,
  Clock,
  CheckCircle,
  Circle,
  ArrowRight,
  Lightning,
  Fire,
  Warning,
  Tag,
  ChatCircle,
  DotsThree,
  Eye,
  Pencil,
  Trash,
  Copy,
  Link,
  Timer,
  Sparkle,
  Star,
  ArrowsClockwise,
  CaretRight,
  Check
} from '@phosphor-icons/react'
import { Task, TeamMember, mockTeamMembers } from '@/lib/collaboration-data'
import { cn } from '@/lib/utils'
import { priorityColors } from './constants'
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

export interface TaskCardProps {
  task: Task
  onClick: () => void
  compact?: boolean
  onStatusChange?: (status: Task['status']) => void
  isDraggable?: boolean
  isDragging?: boolean
  teamMembers?: TeamMember[]
  allTasks?: Task[]
}

const priorityConfig = {
  low: {
    color: 'text-blue-500',
    bgColor: 'bg-blue-500',
    lightBg: 'bg-blue-500/10',
    gradient: 'from-blue-500 to-cyan-500',
    border: 'border-l-blue-500',
    ring: 'ring-blue-500/20',
    label: 'Low',
    icon: FlagBanner
  },
  medium: {
    color: 'text-amber-500',
    bgColor: 'bg-amber-500',
    lightBg: 'bg-amber-500/10',
    gradient: 'from-amber-500 to-yellow-500',
    border: 'border-l-amber-500',
    ring: 'ring-amber-500/20',
    label: 'Medium',
    icon: FlagBanner
  },
  high: {
    color: 'text-orange-500',
    bgColor: 'bg-orange-500',
    lightBg: 'bg-orange-500/10',
    gradient: 'from-orange-500 to-red-500',
    border: 'border-l-orange-500',
    ring: 'ring-orange-500/20',
    label: 'High',
    icon: FlagBanner
  },
  critical: {
    color: 'text-red-500',
    bgColor: 'bg-red-500',
    lightBg: 'bg-red-500/10',
    gradient: 'from-red-500 to-pink-500',
    border: 'border-l-red-500',
    ring: 'ring-red-500/20',
    label: 'Critical',
    icon: Fire
  }
}

const statusConfig = {
  todo: {
    icon: Circle,
    color: 'text-slate-500',
    bgColor: 'bg-slate-500/10',
    gradient: 'from-slate-500 to-gray-500',
    label: 'To Do',
    description: 'Not started yet'
  },
  'in-progress': {
    icon: Lightning,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    gradient: 'from-blue-500 to-cyan-500',
    label: 'In Progress',
    description: 'Currently being worked on'
  },
  review: {
    icon: Eye,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    gradient: 'from-purple-500 to-violet-500',
    label: 'In Review',
    description: 'Awaiting review'
  },
  done: {
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    gradient: 'from-green-500 to-emerald-500',
    label: 'Done',
    description: 'Completed'
  }
}

const TaskCard = ({ 
  task, 
  onClick, 
  compact = false, 
  onStatusChange, 
  isDraggable = false, 
  isDragging = false, 
  teamMembers = mockTeamMembers, 
  allTasks = [] 
}: TaskCardProps) => {
  const [isHovered, setIsHovered] = useState(false)
  const assignee = teamMembers.find(m => m.id === task.assigneeId)
  const priority = priorityConfig[task.priority]
  const status = statusConfig[task.status]
  const StatusIcon = status.icon
  const PriorityIcon = priority.icon
  
  const getDueDateInfo = () => {
    if (!task.dueDate) return null
    
    const now = Date.now()
    const dueDate = new Date(task.dueDate)
    const isOverdue = task.dueDate < now && task.status !== 'done'
    const daysUntilDue = Math.ceil((task.dueDate - now) / (1000 * 60 * 60 * 24))
    const hoursUntilDue = Math.ceil((task.dueDate - now) / (1000 * 60 * 60))
    
    return { dueDate, isOverdue, daysUntilDue, hoursUntilDue }
  }
  
  const dueDateInfo = getDueDateInfo()

  const dependencies = (task.dependencies || []).length
  const blockedByIncomplete = allTasks
    .filter(t => (task.dependencies || []).includes(t.id))
    .some(t => t.status !== 'done')

  // Calculate task progress based on subtasks or estimation
  const progress = task.status === 'done' ? 100 : 
                   task.status === 'review' ? 75 :
                   task.status === 'in-progress' ? 40 : 0

  // Estimate time remaining (mock calculation)
  const estimatedHours = task.priority === 'critical' ? 2 : 
                         task.priority === 'high' ? 4 : 
                         task.priority === 'medium' ? 8 : 16

  const formatDueDate = (date: Date) => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <TooltipProvider>
      <Card 
        className={cn(
          "cursor-pointer transition-all duration-300 group relative overflow-hidden",
          "hover:shadow-xl hover:shadow-primary/10",
          "border-0 shadow-md",
          isDragging && "opacity-80 cursor-grabbing rotate-3 scale-105 shadow-2xl z-50",
          blockedByIncomplete && "ring-2 ring-orange-500/40",
          task.status === 'done' && "opacity-80"
        )} 
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Top gradient bar based on priority */}
        <div className={cn(
          "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r transition-all duration-300",
          priority.gradient,
          isHovered && "h-1.5"
        )} />

        {/* Animated background gradient on hover */}
        <div className={cn(
          "absolute inset-0 opacity-0 transition-opacity duration-500 pointer-events-none",
          "bg-gradient-to-br from-primary/5 via-transparent to-primary/5",
          isHovered && "opacity-100"
        )} />

        {/* Critical priority pulse effect */}
        {task.priority === 'critical' && task.status !== 'done' && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-pink-500 animate-pulse" />
          </div>
        )}

        <CardContent className={cn("relative", compact ? 'p-3' : 'p-4 pt-5')}>
          <div className="space-y-3">
            {/* Header Row with Drag Handle, Title, and Actions */}
            <div className="flex items-start gap-2">
              {isDraggable && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="mt-1 flex-shrink-0 cursor-grab active:cursor-grabbing">
                      <DotsSixVertical 
                        size={16} 
                        weight="bold" 
                        className={cn(
                          "text-muted-foreground/20 transition-all duration-200",
                          "opacity-0 group-hover:opacity-100 hover:text-primary hover:scale-110"
                        )} 
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left">Drag to reorder</TooltipContent>
                </Tooltip>
              )}
              
              <div className="flex-1 min-w-0 space-y-1">
                {/* Priority & Status inline badges */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "h-5 px-1.5 gap-1 text-[10px] font-semibold border-0",
                          `bg-gradient-to-r ${priority.gradient} text-white shadow-sm`
                        )}
                      >
                        <PriorityIcon size={10} weight="fill" />
                        {priority.label}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>{priority.label} Priority</TooltipContent>
                  </Tooltip>
                  
                  {dependencies > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "h-5 px-1.5 gap-1 text-[10px] font-medium",
                            blockedByIncomplete 
                              ? "border-orange-500/50 bg-orange-500/10 text-orange-600 dark:text-orange-400" 
                              : "border-muted-foreground/20"
                          )}
                        >
                          <GitBranch size={10} weight="bold" />
                          {dependencies}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        {blockedByIncomplete 
                          ? `Blocked by ${dependencies} incomplete ${dependencies === 1 ? 'dependency' : 'dependencies'}` 
                          : `${dependencies} ${dependencies === 1 ? 'dependency' : 'dependencies'}`}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  
                  {task.status === 'in-progress' && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="h-5 px-1.5 gap-1 text-[10px] font-medium border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400">
                          <Timer size={10} weight="bold" />
                          ~{estimatedHours}h
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>Estimated {estimatedHours} hours remaining</TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {/* Task Title */}
                <h4 className={cn(
                  "font-semibold text-sm leading-snug line-clamp-2 transition-colors duration-200",
                  task.status === 'done' && "line-through text-muted-foreground",
                  isHovered && task.status !== 'done' && "text-primary"
                )}>
                  {task.title}
                </h4>
              </div>
              
              {/* Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                      "h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity",
                      "hover:bg-muted"
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DotsThree size={16} weight="bold" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Actions</DropdownMenuLabel>
                  <DropdownMenuItem className="gap-2 text-sm">
                    <Eye size={14} />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 text-sm">
                    <Pencil size={14} />
                    Edit Task
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 text-sm">
                    <Copy size={14} />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 text-sm">
                    <Link size={14} />
                    Copy Link
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2 text-sm">
                    <GitBranch size={14} />
                    Manage Dependencies
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 text-sm">
                    <Users size={14} />
                    Reassign
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2 text-sm text-destructive focus:text-destructive">
                    <Trash size={14} />
                    Delete Task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Description */}
            {!compact && task.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed pl-0.5">
                {task.description}
              </p>
            )}

            {/* Blocked Warning Banner */}
            {blockedByIncomplete && (
              <div className="flex items-center gap-2 text-xs bg-gradient-to-r from-orange-500/10 to-amber-500/10 px-3 py-2 rounded-lg border border-orange-500/20">
                <div className="h-6 w-6 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <Warning size={12} weight="fill" className="text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-orange-600 dark:text-orange-400">Blocked</span>
                  <span className="text-muted-foreground ml-1">· Waiting on {dependencies} {dependencies === 1 ? 'task' : 'tasks'}</span>
                </div>
              </div>
            )}

            {/* Progress Section (for in-progress/review tasks) */}
            {(task.status === 'in-progress' || task.status === 'review') && (
              <div className="space-y-2 bg-muted/30 rounded-lg p-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "h-5 w-5 rounded flex items-center justify-center",
                      `bg-gradient-to-br ${status.gradient}`
                    )}>
                      <StatusIcon size={10} weight="fill" className="text-white" />
                    </div>
                    <span className="text-xs font-medium">{status.label}</span>
                  </div>
                  <span className="text-xs font-bold text-primary">{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            )}
            
            {/* Due Date & Time Info */}
            {dueDateInfo && (
              <div className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                dueDateInfo.isOverdue 
                  ? "bg-red-500/10 border border-red-500/20 dark:bg-red-500/15 dark:border-red-500/30" 
                  : dueDateInfo.daysUntilDue <= 1 
                    ? "bg-orange-500/10 border border-orange-500/20 dark:bg-orange-500/15 dark:border-orange-500/30" 
                    : dueDateInfo.daysUntilDue <= 3 
                      ? "bg-amber-500/10 border border-amber-500/20 dark:bg-amber-500/15 dark:border-amber-500/30" 
                      : "bg-muted/40 border border-border/40 dark:bg-muted/20"
              )}>
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
                  dueDateInfo.isOverdue 
                    ? "bg-red-500/20 dark:bg-red-500/30" 
                    : dueDateInfo.daysUntilDue <= 1 
                      ? "bg-orange-500/20 dark:bg-orange-500/30" 
                      : dueDateInfo.daysUntilDue <= 3 
                        ? "bg-amber-500/20 dark:bg-amber-500/30" 
                        : "bg-muted dark:bg-muted/50"
                )}>
                  <CalendarBlank 
                    size={16} 
                    weight={dueDateInfo.isOverdue ? 'fill' : 'bold'} 
                    className={cn(
                      dueDateInfo.isOverdue 
                        ? "text-red-500 dark:text-red-400" 
                        : dueDateInfo.daysUntilDue <= 1 
                          ? "text-orange-500 dark:text-orange-400" 
                          : dueDateInfo.daysUntilDue <= 3 
                            ? "text-amber-500 dark:text-amber-400" 
                            : "text-muted-foreground"
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-xs font-semibold",
                    dueDateInfo.isOverdue 
                      ? "text-red-600 dark:text-red-400" 
                      : dueDateInfo.daysUntilDue <= 1 
                        ? "text-orange-600 dark:text-orange-400" 
                        : dueDateInfo.daysUntilDue <= 3 
                          ? "text-amber-600 dark:text-amber-400" 
                          : "text-foreground"
                  )}>
                    {dueDateInfo.isOverdue ? 'Overdue!' : 
                     dueDateInfo.daysUntilDue === 0 ? 'Due today' :
                     dueDateInfo.daysUntilDue === 1 ? 'Due tomorrow' :
                     `Due in ${dueDateInfo.daysUntilDue} days`}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDueDate(dueDateInfo.dueDate)} · {dueDateInfo.dueDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
                {dueDateInfo.isOverdue && (
                  <Badge variant="destructive" className="text-[10px] h-5 animate-pulse">
                    {Math.abs(dueDateInfo.daysUntilDue)}d late
                  </Badge>
                )}
              </div>
            )}

            {/* Tags */}
            {(task.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(task.tags || []).slice(0, 4).map((tag, index) => (
                  <Badge 
                    key={tag} 
                    variant="secondary" 
                    className={cn(
                      "text-[10px] h-5 px-2 font-medium border-0 transition-all duration-200",
                      "bg-gradient-to-r from-muted to-muted/50 hover:from-primary/10 hover:to-primary/5",
                      "hover:scale-105"
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full mr-1.5" style={{
                      backgroundColor: `hsl(${(index * 60) % 360}, 70%, 50%)`
                    }} />
                    {tag}
                  </Badge>
                ))}
                {(task.tags || []).length > 4 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-[10px] h-5 px-2 font-medium">
                        +{(task.tags || []).length - 4}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      {(task.tags || []).slice(4).join(', ')}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
            
            {/* Footer Row - Assignee & Status */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/50">
              {/* Assignee */}
              <Tooltip>
                <TooltipTrigger asChild>
                  {assignee ? (
                    <div className="flex items-center gap-2.5 group/assignee min-w-0 flex-1">
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-7 w-7 ring-2 ring-background shadow-sm">
                          <AvatarImage src={assignee.avatarUrl} alt={assignee.name} />
                          <AvatarFallback className={cn(
                            "text-[10px] font-bold text-white",
                            `bg-gradient-to-br ${priority.gradient}`
                          )}>
                            {assignee.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        {assignee.isOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background">
                            <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate group-hover/assignee:text-primary transition-colors">
                          {assignee.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {assignee.role}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 text-muted-foreground hover:text-foreground transition-colors group/unassigned">
                      <div className="h-7 w-7 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center group-hover/unassigned:border-primary/50 transition-colors">
                        <Users size={12} className="opacity-50 group-hover/unassigned:opacity-100" />
                      </div>
                      <div>
                        <p className="text-xs font-medium">Unassigned</p>
                        <p className="text-[10px] text-muted-foreground">Click to assign</p>
                      </div>
                    </div>
                  )}
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {assignee ? (
                    <div className="text-center">
                      <p className="font-medium">{assignee.name}</p>
                      <p className="text-xs text-muted-foreground">{assignee.email}</p>
                    </div>
                  ) : 'Click to assign someone'}
                </TooltipContent>
              </Tooltip>
              
              {/* Status Selector */}
              {onStatusChange ? (
                <Select
                  value={task.status}
                  onValueChange={(val) => {
                    onStatusChange(val as Task['status'])
                  }}
                >
                  <SelectTrigger 
                    className={cn(
                      "h-8 w-auto gap-2 text-xs font-medium border-0 shadow-sm",
                      `bg-gradient-to-r ${status.gradient} text-white`,
                      "hover:opacity-90 transition-all duration-200 hover:scale-105"
                    )} 
                    onClick={(e) => e.stopPropagation()}
                  >
                    <StatusIcon size={12} weight="fill" />
                    <SelectValue />
                    <CaretRight size={10} className="opacity-70" />
                  </SelectTrigger>
                  <SelectContent align="end" className="w-44">
                    <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5">Change Status</DropdownMenuLabel>
                    <SelectItem value="todo" className="gap-2">
                      <div className="flex items-center gap-2 w-full">
                        <div className="h-5 w-5 rounded bg-gradient-to-br from-slate-500 to-gray-500 flex items-center justify-center">
                          <Circle size={10} weight="bold" className="text-white" />
                        </div>
                        <div className="flex-1">
                          <span className="font-medium">To Do</span>
                        </div>
                        {task.status === 'todo' && <Check size={12} className="text-primary" />}
                      </div>
                    </SelectItem>
                    <SelectItem value="in-progress" className="gap-2">
                      <div className="flex items-center gap-2 w-full">
                        <div className="h-5 w-5 rounded bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                          <Lightning size={10} weight="fill" className="text-white" />
                        </div>
                        <div className="flex-1">
                          <span className="font-medium">In Progress</span>
                        </div>
                        {task.status === 'in-progress' && <Check size={12} className="text-primary" />}
                      </div>
                    </SelectItem>
                    <SelectItem value="review" className="gap-2">
                      <div className="flex items-center gap-2 w-full">
                        <div className="h-5 w-5 rounded bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center">
                          <Eye size={10} weight="fill" className="text-white" />
                        </div>
                        <div className="flex-1">
                          <span className="font-medium">In Review</span>
                        </div>
                        {task.status === 'review' && <Check size={12} className="text-primary" />}
                      </div>
                    </SelectItem>
                    <SelectItem value="done" className="gap-2">
                      <div className="flex items-center gap-2 w-full">
                        <div className="h-5 w-5 rounded bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                          <CheckCircle size={10} weight="fill" className="text-white" />
                        </div>
                        <div className="flex-1">
                          <span className="font-medium">Done</span>
                        </div>
                        {task.status === 'done' && <Check size={12} className="text-primary" />}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "h-7 px-2.5 gap-1.5 text-xs font-medium border-0 shadow-sm",
                    `bg-gradient-to-r ${status.gradient} text-white`
                  )}
                >
                  <StatusIcon size={12} weight="fill" />
                  {status.label}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}

export default TaskCard

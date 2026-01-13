import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  CaretLeft, 
  CaretRight, 
  CalendarBlank, 
  FlagBanner,
  Clock,
  Users,
  Export,
  GoogleLogo,
  CheckCircle,
  Circle,
  ArrowRight,
  User,
  ListChecks
} from '@phosphor-icons/react'
import { Task, TeamMember } from '@/lib/collaboration-data'
import { cn } from '@/lib/utils'
import { exportTasksToICal, getGoogleCalendarUrl } from '@/lib/ical-export'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface CalendarViewProps {
  tasks: Task[]
  teamMembers: TeamMember[]
}

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  tasks: Task[]
}

const priorityColors = {
  low: 'bg-blue-500 text-white',
  medium: 'bg-yellow-500 text-white',
  high: 'bg-orange-500 text-white',
  critical: 'bg-red-500 text-white'
}

const priorityBorderColors = {
  low: 'border-l-blue-500',
  medium: 'border-l-yellow-500',
  high: 'border-l-orange-500',
  critical: 'border-l-red-500'
}

const priorityDotColors = {
  low: 'bg-blue-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500'
}

const statusConfig = {
  'todo': { label: 'To Do', color: 'bg-slate-500', icon: Circle },
  'in-progress': { label: 'In Progress', color: 'bg-blue-500', icon: Clock },
  'review': { label: 'Review', color: 'bg-purple-500', icon: ListChecks },
  'done': { label: 'Done', color: 'bg-green-500', icon: CheckCircle }
}

const CalendarView = ({ tasks, teamMembers }: CalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date())
  const [filterAssignee, setFilterAssignee] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'calendar' | 'agenda'>('calendar')

  const tasksWithDueDate = tasks.filter(t => t.dueDate)

  const filteredTasks = useMemo(() => {
    return tasksWithDueDate.filter(task => {
      if (filterAssignee !== 'all') {
        if (filterAssignee === 'unassigned' && task.assigneeId) return false
        if (filterAssignee !== 'unassigned' && task.assigneeId !== filterAssignee) return false
      }
      return true
    })
  }, [tasksWithDueDate, filterAssignee])

  const getDaysInMonth = (date: Date): CalendarDay[] => {
    const year = date.getFullYear()
    const month = date.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    
    const startDayOfWeek = firstDay.getDay()
    const previousMonth = new Date(year, month, 0)
    const daysInPreviousMonth = previousMonth.getDate()
    
    const days: CalendarDay[] = []
    
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, daysInPreviousMonth - i)
      days.push({
        date,
        isCurrentMonth: false,
        isToday: isToday(date),
        tasks: getTasksForDate(date)
      })
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i)
      days.push({
        date,
        isCurrentMonth: true,
        isToday: isToday(date),
        tasks: getTasksForDate(date)
      })
    }
    
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i)
      days.push({
        date,
        isCurrentMonth: false,
        isToday: isToday(date),
        tasks: getTasksForDate(date)
      })
    }
    
    return days
  }

  const isToday = (date: Date): boolean => {
    const today = new Date()
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear()
  }

  const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear()
  }

  const getTasksForDate = (date: Date): Task[] => {
    return filteredTasks.filter(task => {
      if (!task.dueDate) return false
      const taskDate = new Date(task.dueDate)
      return isSameDay(taskDate, date)
    })
  }

  // Group tasks by assignee for a given day
  const getTasksGroupedByAssignee = (dayTasks: Task[]) => {
    const grouped: { member: TeamMember | null; tasks: Task[] }[] = []
    
    // Group assigned tasks by team member
    teamMembers.forEach(member => {
      const memberTasks = dayTasks.filter(t => t.assigneeId === member.id)
      if (memberTasks.length > 0) {
        grouped.push({ member, tasks: memberTasks })
      }
    })
    
    // Add unassigned tasks
    const unassignedTasks = dayTasks.filter(t => !t.assigneeId)
    if (unassignedTasks.length > 0) {
      grouped.push({ member: null, tasks: unassignedTasks })
    }
    
    return grouped
  }

  // Get unique assignees for a day's tasks (for calendar cell display)
  const getAssigneesForDay = (dayTasks: Task[]): (TeamMember | null)[] => {
    const assigneeIds = new Set(dayTasks.map(t => t.assigneeId))
    const assignees: (TeamMember | null)[] = []
    
    assigneeIds.forEach(id => {
      if (id) {
        const member = teamMembers.find(m => m.id === id)
        if (member) assignees.push(member)
      } else {
        assignees.push(null)
      }
    })
    
    return assignees
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDay(new Date())
  }

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })
  const calendarDays = getDaysInMonth(currentDate)
  const selectedDayTasks = selectedDay ? getTasksForDate(selectedDay) : []
  const selectedDayGrouped = selectedDay ? getTasksGroupedByAssignee(selectedDayTasks) : []

  const overdueTasks = filteredTasks
    .filter(task => task.dueDate && task.dueDate < Date.now() && task.status !== 'done')
    .sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0))

  const handleExportAll = () => {
    if (filteredTasks.length === 0) {
      toast.error('No tasks to export')
      return
    }
    exportTasksToICal(filteredTasks, 'All Tasks')
    toast.success(`Exported ${filteredTasks.length} tasks to iCal format`)
  }

  const handleExportMonth = () => {
    const monthTasks = calendarDays
      .filter(day => day.isCurrentMonth)
      .flatMap(day => day.tasks)
    
    if (monthTasks.length === 0) {
      toast.error('No tasks in this month')
      return
    }
    
    const uniqueTasks = Array.from(new Map(monthTasks.map(t => [t.id, t])).values())
    exportTasksToICal(uniqueTasks, `${monthName} Tasks`)
    toast.success(`Exported ${uniqueTasks.length} tasks from ${monthName}`)
  }

  const handleExportSelected = () => {
    if (!selectedDay || selectedDayTasks.length === 0) {
      toast.error('No tasks selected')
      return
    }
    exportTasksToICal(
      selectedDayTasks, 
      `${selectedDay.toLocaleDateString('default', { month: 'long', day: 'numeric' })} Tasks`
    )
    toast.success(`Exported ${selectedDayTasks.length} tasks`)
  }

  const handleAddToGoogleCalendar = () => {
    if (selectedDayTasks.length === 0) {
      toast.error('No tasks selected')
      return
    }
    const url = getGoogleCalendarUrl(selectedDayTasks)
    if (url) {
      window.open(url, '_blank')
      toast.success('Opening Google Calendar')
    } else {
      toast.error('Unable to create Google Calendar link')
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                <CalendarBlank size={24} weight="fill" className="text-white" />
              </div>
              Task Calendar
            </h2>
            <p className="text-muted-foreground">
              Visualize deadlines and track team assignments
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Assignees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {teamMembers.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={member.avatarUrl} />
                        <AvatarFallback className="text-[10px]">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      {member.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Export size={18} />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Export to iCal</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleExportAll}>
                  <CalendarBlank size={16} className="mr-2" />
                  All Tasks ({filteredTasks.length})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportMonth}>
                  <CalendarBlank size={16} className="mr-2" />
                  Current Month
                </DropdownMenuItem>
                {selectedDay && selectedDayTasks.length > 0 && (
                  <DropdownMenuItem onClick={handleExportSelected}>
                    <CalendarBlank size={16} className="mr-2" />
                    Selected Day ({selectedDayTasks.length})
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Quick Add</DropdownMenuLabel>
                {selectedDay && selectedDayTasks.length > 0 ? (
                  <DropdownMenuItem onClick={handleAddToGoogleCalendar}>
                    <GoogleLogo size={16} className="mr-2" />
                    Add to Google Calendar
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem disabled>
                    <GoogleLogo size={16} className="mr-2" />
                    Select a day with tasks
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Overdue Alert */}
        {overdueTasks.length > 0 && (
          <Card className="border-red-500/50 bg-gradient-to-r from-red-500/10 to-red-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-red-600 flex items-center gap-2 text-base">
                <Clock size={20} weight="bold" />
                {overdueTasks.length} Overdue Task{overdueTasks.length > 1 ? 's' : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {overdueTasks.slice(0, 5).map(task => {
                  const assignee = teamMembers.find(m => m.id === task.assigneeId)
                  const daysOverdue = Math.ceil((Date.now() - (task.dueDate || 0)) / (1000 * 60 * 60 * 24))
                  return (
                    <div key={task.id} className="flex items-center gap-2 px-3 py-2 bg-card rounded-lg border border-red-500/30">
                      {assignee ? (
                        <Avatar className="h-6 w-6 border-2 border-red-500/50">
                          <AvatarImage src={assignee.avatarUrl} alt={assignee.name} />
                          <AvatarFallback className="text-[10px] bg-red-100">
                            {assignee.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                          <User size={12} className="text-muted-foreground" />
                        </div>
                      )}
                      <span className="text-sm font-medium truncate max-w-[150px]">{task.title}</span>
                      <Badge variant="destructive" className="text-[10px] h-5">
                        {daysOverdue}d
                      </Badge>
                    </div>
                  )
                })}
                {overdueTasks.length > 5 && (
                  <Badge variant="outline" className="text-red-600 border-red-500/50">
                    +{overdueTasks.length - 5} more
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Grid */}
        <div className="grid lg:grid-cols-[1fr,400px] gap-6">
          {/* Calendar */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <span className="text-xl font-bold">{monthName}</span>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={goToToday} className="h-8">
                    Today
                  </Button>
                  <div className="flex items-center border rounded-lg overflow-hidden">
                    <Button variant="ghost" size="icon" onClick={previousMonth} className="h-8 w-8 rounded-none">
                      <CaretLeft size={18} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8 rounded-none">
                      <CaretRight size={18} />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="py-2">{day}</div>
                  ))}
                </div>
                
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, index) => {
                    const isSelected = selectedDay ? isSameDay(day.date, selectedDay) : false
                    const hasTasks = day.tasks.length > 0
                    const hasOverdue = day.tasks.some(t => t.dueDate && t.dueDate < Date.now() && t.status !== 'done')
                    const dayAssignees = getAssigneesForDay(day.tasks)
                    
                    return (
                      <Tooltip key={index}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setSelectedDay(day.date)}
                            className={cn(
                              "min-h-[80px] p-1.5 rounded-lg border transition-all relative flex flex-col",
                              "hover:border-primary hover:shadow-md",
                              day.isCurrentMonth ? "bg-card" : "bg-muted/30",
                              day.isToday && "ring-2 ring-primary ring-offset-1",
                              isSelected && "border-primary bg-primary/5 shadow-md",
                              !day.isCurrentMonth && "opacity-50",
                              hasOverdue && !isSelected && "border-red-500/50 bg-red-500/5"
                            )}
                          >
                            {/* Date Number */}
                            <div className={cn(
                              "text-sm font-medium mb-1",
                              day.isToday && "text-primary font-bold",
                              isSelected && "text-primary"
                            )}>
                              {day.date.getDate()}
                            </div>
                            
                            {/* Task Indicators & Assignee Avatars */}
                            {hasTasks && (
                              <div className="flex-1 flex flex-col justify-between">
                                {/* Assignee Avatars */}
                                <div className="flex flex-wrap gap-0.5 justify-start">
                                  {dayAssignees.slice(0, 4).map((assignee, idx) => (
                                    assignee ? (
                                      <Avatar key={assignee.id} className="h-5 w-5 border border-background">
                                        <AvatarImage src={assignee.avatarUrl} alt={assignee.name} />
                                        <AvatarFallback className="text-[8px] bg-primary/10">
                                          {assignee.name.split(' ').map(n => n[0]).join('')}
                                        </AvatarFallback>
                                      </Avatar>
                                    ) : (
                                      <div key={`unassigned-${idx}`} className="h-5 w-5 rounded-full bg-muted border border-background flex items-center justify-center">
                                        <User size={10} className="text-muted-foreground" />
                                      </div>
                                    )
                                  ))}
                                  {dayAssignees.length > 4 && (
                                    <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold">
                                      +{dayAssignees.length - 4}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Task Count & Priority Dots */}
                                <div className="flex items-center justify-between mt-1">
                                  <div className="flex gap-0.5">
                                    {day.tasks.slice(0, 4).map((task, idx) => (
                                      <div
                                        key={idx}
                                        className={cn(
                                          "w-1.5 h-1.5 rounded-full",
                                          task.dueDate && task.dueDate < Date.now() && task.status !== 'done'
                                            ? "bg-red-500"
                                            : priorityDotColors[task.priority]
                                        )}
                                      />
                                    ))}
                                  </div>
                                  <Badge variant="secondary" className="text-[9px] h-4 px-1">
                                    {day.tasks.length}
                                  </Badge>
                                </div>
                              </div>
                            )}
                          </button>
                        </TooltipTrigger>
                        {hasTasks && (
                          <TooltipContent side="top" className="max-w-[250px]">
                            <p className="font-semibold mb-1">
                              {day.date.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {day.tasks.length} task{day.tasks.length !== 1 ? 's' : ''} • {dayAssignees.length} assignee{dayAssignees.length !== 1 ? 's' : ''}
                            </p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    )
                  })}
                </div>
              </div>
              
              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span>Critical/Overdue</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <span>High</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span>Medium</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Low</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Day Panel */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b pb-4">
              {selectedDay ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        {selectedDay.toLocaleDateString('default', { weekday: 'long' })}
                      </p>
                      <CardTitle className="text-2xl font-bold">
                        {selectedDay.toLocaleDateString('default', { month: 'long', day: 'numeric' })}
                      </CardTitle>
                    </div>
                    {isToday(selectedDay) && (
                      <Badge className="bg-primary text-primary-foreground">Today</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1.5 text-sm">
                      <ListChecks size={16} className="text-primary" />
                      <span className="font-medium">{selectedDayTasks.length}</span>
                      <span className="text-muted-foreground">task{selectedDayTasks.length !== 1 ? 's' : ''}</span>
                    </div>
                    <Separator orientation="vertical" className="h-4" />
                    <div className="flex items-center gap-1.5 text-sm">
                      <Users size={16} className="text-primary" />
                      <span className="font-medium">{selectedDayGrouped.length}</span>
                      <span className="text-muted-foreground">assignee{selectedDayGrouped.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </>
              ) : (
                <CardTitle className="text-lg">Select a Day</CardTitle>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[550px]">
                {!selectedDay ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <CalendarBlank size={56} className="text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">Click on a day to see tasks</p>
                  </div>
                ) : selectedDayTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-3">
                      <CheckCircle size={32} className="text-green-500" />
                    </div>
                    <p className="font-medium">No tasks due</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      This day is free! 🎉
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {selectedDayGrouped.map(({ member, tasks: memberTasks }, groupIndex) => (
                      <div key={member?.id || 'unassigned'} className="p-4">
                        {/* Assignee Header */}
                        <div className="flex items-center gap-3 mb-3">
                          {member ? (
                            <>
                              <Avatar className="h-10 w-10 border-2 border-primary/20">
                                <AvatarImage src={member.avatarUrl} alt={member.name} />
                                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                  {member.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">{member.name}</p>
                                <p className="text-xs text-muted-foreground">{member.role}</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                <User size={20} className="text-muted-foreground" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-muted-foreground">Unassigned</p>
                                <p className="text-xs text-muted-foreground">No team member assigned</p>
                              </div>
                            </>
                          )}
                          <Badge variant="secondary" className="h-6">
                            {memberTasks.length} task{memberTasks.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        
                        {/* Tasks for this assignee */}
                        <div className="space-y-2 pl-2">
                          {memberTasks.map(task => {
                            const isOverdue = task.dueDate && task.dueDate < Date.now() && task.status !== 'done'
                            const StatusIcon = statusConfig[task.status]?.icon || Circle
                            
                            return (
                              <div 
                                key={task.id}
                                className={cn(
                                  "p-3 rounded-lg border-l-4 bg-card hover:bg-muted/50 transition-colors",
                                  isOverdue ? "border-l-red-500 bg-red-500/5" : priorityBorderColors[task.priority]
                                )}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={cn(
                                    "mt-0.5 p-1.5 rounded-full",
                                    task.status === 'done' ? "bg-green-500/10" : "bg-muted"
                                  )}>
                                    <StatusIcon 
                                      size={14} 
                                      weight={task.status === 'done' ? 'fill' : 'regular'}
                                      className={cn(
                                        task.status === 'done' ? "text-green-600" : "text-muted-foreground"
                                      )}
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={cn(
                                      "font-medium text-sm",
                                      task.status === 'done' && "line-through text-muted-foreground"
                                    )}>
                                      {task.title}
                                    </p>
                                    {task.description && (
                                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                        {task.description}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                      <Badge 
                                        variant="outline" 
                                        className={cn(
                                          "text-[10px] h-5",
                                          isOverdue && "border-red-500 text-red-600"
                                        )}
                                      >
                                        {isOverdue ? 'Overdue' : task.priority}
                                      </Badge>
                                      <Badge 
                                        variant="secondary" 
                                        className={cn(
                                          "text-[10px] h-5",
                                          statusConfig[task.status]?.color && `${statusConfig[task.status].color} text-white`
                                        )}
                                      >
                                        {statusConfig[task.status]?.label || task.status}
                                      </Badge>
                                      {task.tags && task.tags.length > 0 && (
                                        <Badge variant="outline" className="text-[10px] h-5">
                                          {task.tags[0]}
                                          {task.tags.length > 1 && ` +${task.tags.length - 1}`}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <FlagBanner 
                                    size={16} 
                                    weight="fill" 
                                    className={cn(
                                      "flex-shrink-0",
                                      isOverdue ? "text-red-500" :
                                      task.priority === 'critical' ? "text-red-500" :
                                      task.priority === 'high' ? "text-orange-500" :
                                      task.priority === 'medium' ? "text-yellow-500" : "text-blue-500"
                                    )}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Tasks</p>
                  <p className="text-3xl font-bold text-blue-600">{filteredTasks.length}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <ListChecks size={24} className="text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-3xl font-bold text-red-600">{overdueTasks.length}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Clock size={24} className="text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-3xl font-bold text-green-600">
                    {filteredTasks.filter(t => t.status === 'done').length}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <CheckCircle size={24} className="text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Team Members</p>
                  <p className="text-3xl font-bold text-purple-600">{teamMembers.length}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Users size={24} className="text-purple-600" />
                </div>
              </div>
              <div className="flex -space-x-2 mt-3">
                {teamMembers.slice(0, 5).map(member => (
                  <Avatar key={member.id} className="h-7 w-7 border-2 border-background">
                    <AvatarImage src={member.avatarUrl} alt={member.name} />
                    <AvatarFallback className="text-[10px]">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {teamMembers.length > 5 && (
                  <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium">
                    +{teamMembers.length - 5}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default CalendarView

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  CaretLeft, 
  CaretRight, 
  CalendarBlank, 
  FlagBanner,
  Clock,
  Users
} from '@phosphor-icons/react'
import { Task, TeamMember } from '@/lib/collaboration-data'
import { cn } from '@/lib/utils'

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
  low: 'border-blue-500',
  medium: 'border-yellow-500',
  high: 'border-orange-500',
  critical: 'border-red-500'
}

const CalendarView = ({ tasks, teamMembers }: CalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [filterAssignee, setFilterAssignee] = useState<string>('all')

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

  const upcomingTasks = filteredTasks
    .filter(task => task.dueDate && task.dueDate >= Date.now())
    .sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0))
    .slice(0, 5)

  const overdueTasks = filteredTasks
    .filter(task => task.dueDate && task.dueDate < Date.now() && task.status !== 'done')
    .sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold mb-2">Task Calendar</h2>
          <p className="text-muted-foreground text-lg">
            Visualize deadlines and plan your schedule
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Assignees" />
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
        </div>
      </div>

      {overdueTasks.length > 0 && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-600 flex items-center gap-2">
              <Clock size={20} weight="bold" />
              Overdue Tasks ({overdueTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueTasks.slice(0, 3).map(task => {
                const assignee = teamMembers.find(m => m.id === task.assigneeId)
                const daysOverdue = Math.ceil((Date.now() - (task.dueDate || 0)) / (1000 * 60 * 60 * 24))
                return (
                  <div key={task.id} className="flex items-center justify-between p-2 bg-card rounded-lg border">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FlagBanner size={16} weight="fill" className="text-red-600 flex-shrink-0" />
                      <span className="text-sm font-medium truncate">{task.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">
                        {daysOverdue}d overdue
                      </Badge>
                      {assignee && (
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={assignee.avatarUrl} alt={assignee.name} />
                          <AvatarFallback className="text-xs">
                            {assignee.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  </div>
                )
              })}
              {overdueTasks.length > 3 && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  +{overdueTasks.length - 3} more overdue task{overdueTasks.length - 3 > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-[1fr,320px] gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarBlank size={24} weight="duotone" className="text-accent" />
                {monthName}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Today
                </Button>
                <Button variant="outline" size="icon" onClick={previousMonth}>
                  <CaretLeft size={18} />
                </Button>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <CaretRight size={18} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="grid grid-cols-7 gap-2 text-center text-sm font-semibold text-muted-foreground">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>
              
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day, index) => {
                  const isSelected = selectedDay ? isSameDay(day.date, selectedDay) : false
                  const hasTasks = day.tasks.length > 0
                  const hasOverdue = day.tasks.some(t => t.dueDate && t.dueDate < Date.now() && t.status !== 'done')
                  
                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedDay(day.date)}
                      className={cn(
                        "aspect-square p-2 rounded-lg border-2 transition-all relative group",
                        "hover:border-accent hover:bg-accent/10",
                        day.isCurrentMonth ? "bg-card" : "bg-muted/30",
                        day.isToday && "border-accent bg-accent/10 font-semibold",
                        isSelected && "border-primary bg-primary/10",
                        !day.isCurrentMonth && "opacity-50",
                        hasOverdue && "border-red-500/50"
                      )}
                    >
                      <div className="text-sm text-center mb-1">
                        {day.date.getDate()}
                      </div>
                      {hasTasks && (
                        <div className="flex flex-wrap gap-0.5 justify-center">
                          {day.tasks.slice(0, 3).map((task, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                task.dueDate && task.dueDate < Date.now() && task.status !== 'done'
                                  ? "bg-red-500"
                                  : task.priority === 'critical' ? "bg-red-500" :
                                    task.priority === 'high' ? "bg-orange-500" :
                                    task.priority === 'medium' ? "bg-yellow-500" : "bg-blue-500"
                              )}
                            />
                          ))}
                          {day.tasks.length > 3 && (
                            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                          )}
                        </div>
                      )}
                      {hasTasks && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">
                            {day.tasks.length}
                          </Badge>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {selectedDay ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {selectedDay.toLocaleDateString('default', { 
                    weekday: 'long',
                    month: 'long', 
                    day: 'numeric'
                  })}
                </CardTitle>
                <CardDescription>
                  {selectedDayTasks.length} task{selectedDayTasks.length !== 1 ? 's' : ''} due
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[520px]">
                  {selectedDayTasks.length === 0 ? (
                    <div className="text-center py-12">
                      <CalendarBlank size={48} className="mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No tasks due on this day
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedDayTasks.map(task => {
                        const assignee = teamMembers.find(m => m.id === task.assigneeId)
                        const isOverdue = task.dueDate && task.dueDate < Date.now() && task.status !== 'done'
                        
                        return (
                          <Card key={task.id} className={cn(
                            "border-l-4",
                            isOverdue ? "border-l-red-500" : priorityBorderColors[task.priority]
                          )}>
                            <CardContent className="pt-4 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-medium text-sm line-clamp-2 flex-1">{task.title}</h4>
                                <FlagBanner size={16} weight="fill" className={cn(
                                  isOverdue ? "text-red-600" :
                                  task.priority === 'critical' ? "text-red-600" :
                                  task.priority === 'high' ? "text-orange-600" :
                                  task.priority === 'medium' ? "text-yellow-600" : "text-blue-600"
                                )} />
                              </div>
                              
                              {task.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {task.description}
                                </p>
                              )}
                              
                              <div className="flex items-center justify-between gap-2 pt-2">
                                {assignee ? (
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={assignee.avatarUrl} alt={assignee.name} />
                                      <AvatarFallback className="text-xs">
                                        {assignee.name.split(' ').map(n => n[0]).join('')}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-muted-foreground">
                                      {assignee.name.split(' ')[0]}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Unassigned</span>
                                )}
                                
                                <Badge 
                                  variant={
                                    task.status === 'done' ? 'default' :
                                    task.status === 'in-progress' ? 'secondary' : 'outline'
                                  }
                                  className="text-xs"
                                >
                                  {task.status.replace('-', ' ')}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock size={20} weight="duotone" className="text-accent" />
                  Upcoming Tasks
                </CardTitle>
                <CardDescription>Next 5 deadlines</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[520px]">
                  {upcomingTasks.length === 0 ? (
                    <div className="text-center py-12">
                      <CalendarBlank size={48} className="mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No upcoming tasks with deadlines
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingTasks.map(task => {
                        const assignee = teamMembers.find(m => m.id === task.assigneeId)
                        const dueDate = task.dueDate ? new Date(task.dueDate) : null
                        const daysUntil = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
                        
                        return (
                          <Card key={task.id} className={cn(
                            "border-l-4 cursor-pointer hover:shadow-md transition-shadow",
                            priorityBorderColors[task.priority]
                          )}
                          onClick={() => dueDate && setSelectedDay(dueDate)}
                          >
                            <CardContent className="pt-4 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-medium text-sm line-clamp-2 flex-1">{task.title}</h4>
                                <FlagBanner size={16} weight="fill" className={cn(
                                  task.priority === 'critical' ? "text-red-600" :
                                  task.priority === 'high' ? "text-orange-600" :
                                  task.priority === 'medium' ? "text-yellow-600" : "text-blue-600"
                                )} />
                              </div>
                              
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <CalendarBlank size={14} weight="bold" />
                                <span>
                                  {dueDate?.toLocaleDateString()}
                                  {daysUntil !== null && (
                                    <span className={cn(
                                      "ml-1",
                                      daysUntil === 0 ? "text-orange-600 font-semibold" :
                                      daysUntil === 1 ? "text-yellow-600" : ""
                                    )}>
                                      ({daysUntil === 0 ? 'Today' : 
                                        daysUntil === 1 ? 'Tomorrow' : 
                                        `in ${daysUntil} days`})
                                    </span>
                                  )}
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-between gap-2 pt-2">
                                {assignee ? (
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={assignee.avatarUrl} alt={assignee.name} />
                                      <AvatarFallback className="text-xs">
                                        {assignee.name.split(' ').map(n => n[0]).join('')}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-muted-foreground">
                                      {assignee.name.split(' ')[0]}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Unassigned</span>
                                )}
                                
                                <Badge 
                                  variant={
                                    task.status === 'done' ? 'default' :
                                    task.status === 'in-progress' ? 'secondary' : 'outline'
                                  }
                                  className="text-xs"
                                >
                                  {task.status.replace('-', ' ')}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Tasks by Priority</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(['critical', 'high', 'medium', 'low'] as const).map(priority => {
              const count = filteredTasks.filter(t => t.priority === priority).length
              return (
                <div key={priority} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", priorityColors[priority])} />
                    <span className="text-sm capitalize">{priority}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">{count}</Badge>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Tasks by Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(['todo', 'in-progress', 'review', 'done'] as const).map(status => {
              const count = filteredTasks.filter(t => t.status === status).length
              return (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{status.replace('-', ' ')}</span>
                  <Badge variant="secondary" className="text-xs">{count}</Badge>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users size={16} />
              Team Workload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {teamMembers.map(member => {
              const count = filteredTasks.filter(t => t.assigneeId === member.id).length
              return (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={member.avatarUrl} alt={member.name} />
                      <AvatarFallback className="text-xs">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate">{member.name.split(' ')[0]}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">{count}</Badge>
                </div>
              )
            })}
            <div className="flex items-center justify-between pt-1 border-t">
              <span className="text-sm text-muted-foreground">Unassigned</span>
              <Badge variant="secondary" className="text-xs">
                {filteredTasks.filter(t => !t.assigneeId).length}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CalendarView

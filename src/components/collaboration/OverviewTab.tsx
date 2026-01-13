import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { 
  Users, 
  CheckSquare, 
  ShieldCheck,
  Lightning,
  TrendUp,
  Clock,
  Fire,
  Target,
  ArrowRight,
  Plus,
  CalendarBlank,
  ChartBar,
  Sparkle,
  Circle,
  CheckCircle,
  Warning,
  Trophy,
  Rocket
} from '@phosphor-icons/react'
import { Comment, Task, TeamMember, ACCESS_LEVEL_PERMISSIONS } from '@/lib/collaboration-data'
import { cn } from '@/lib/utils'
import ActivityTimeline from '@/components/ActivityTimeline'
import TaskCard from './TaskCard'
import { accessLevelColors, accessLevelIcons, roleColors } from './constants'
import { useNavigation } from '@/contexts'

export interface OverviewTabProps {
  currentUser: TeamMember
  allMembers: TeamMember[]
  tasks: Task[]
  comments: Comment[]
}

// Stat card component for hero section
const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  subValue, 
  trend,
  gradient,
  iconBg 
}: { 
  icon: React.ElementType
  label: string
  value: string | number
  subValue?: string
  trend?: { value: number; positive: boolean }
  gradient: string
  iconBg: string
}) => (
  <Card className={cn(
    "relative overflow-hidden border-0 shadow-lg",
    "bg-gradient-to-br",
    gradient
  )}>
    <div className="absolute inset-0 bg-grid-white/5" />
    <CardContent className="p-5 relative">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-white/80">{label}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{value}</span>
            {subValue && (
              <span className="text-sm text-white/70">{subValue}</span>
            )}
          </div>
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trend.positive ? "text-emerald-200" : "text-red-200"
            )}>
              <TrendUp size={14} weight="bold" className={!trend.positive ? "rotate-180" : ""} />
              {trend.value}% from last week
            </div>
          )}
        </div>
        <div className={cn(
          "h-12 w-12 rounded-xl flex items-center justify-center",
          iconBg
        )}>
          <Icon size={24} weight="duotone" className="text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
)

// Quick action button component
const QuickAction = ({ 
  icon: Icon, 
  label, 
  description,
  onClick,
  variant = "default"
}: { 
  icon: React.ElementType
  label: string
  description: string
  onClick: () => void
  variant?: "default" | "primary"
}) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left w-full",
      "hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
      variant === "primary" 
        ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90" 
        : "bg-card hover:bg-muted/50 border-border"
    )}
  >
    <div className={cn(
      "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
      variant === "primary" ? "bg-white/20" : "bg-primary/10"
    )}>
      <Icon size={20} weight="duotone" className={variant === "primary" ? "text-white" : "text-primary"} />
    </div>
    <div className="flex-1 min-w-0">
      <p className={cn(
        "font-semibold text-sm",
        variant === "primary" ? "text-white" : "text-foreground"
      )}>{label}</p>
      <p className={cn(
        "text-xs truncate",
        variant === "primary" ? "text-white/70" : "text-muted-foreground"
      )}>{description}</p>
    </div>
    <ArrowRight size={18} className={variant === "primary" ? "text-white/70" : "text-muted-foreground"} />
  </button>
)

// Task status distribution component
const TaskDistribution = ({ tasks }: { tasks: Task[] }) => {
  const distribution = useMemo(() => {
    const total = tasks.length || 1
    return {
      todo: { count: tasks.filter(t => t.status === 'todo').length, color: 'bg-slate-500' },
      inProgress: { count: tasks.filter(t => t.status === 'in-progress').length, color: 'bg-blue-500' },
      review: { count: tasks.filter(t => t.status === 'review').length, color: 'bg-purple-500' },
      done: { count: tasks.filter(t => t.status === 'done').length, color: 'bg-emerald-500' }
    }
  }, [tasks])

  const total = tasks.length || 1

  return (
    <div className="space-y-4">
      <div className="flex h-3 rounded-full overflow-hidden bg-muted">
        {distribution.done.count > 0 && (
          <div 
            className={cn("transition-all duration-500", distribution.done.color)} 
            style={{ width: `${(distribution.done.count / total) * 100}%` }} 
          />
        )}
        {distribution.review.count > 0 && (
          <div 
            className={cn("transition-all duration-500", distribution.review.color)} 
            style={{ width: `${(distribution.review.count / total) * 100}%` }} 
          />
        )}
        {distribution.inProgress.count > 0 && (
          <div 
            className={cn("transition-all duration-500", distribution.inProgress.color)} 
            style={{ width: `${(distribution.inProgress.count / total) * 100}%` }} 
          />
        )}
        {distribution.todo.count > 0 && (
          <div 
            className={cn("transition-all duration-500", distribution.todo.color)} 
            style={{ width: `${(distribution.todo.count / total) * 100}%` }} 
          />
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-slate-500" />
          <span className="text-sm text-muted-foreground">To Do</span>
          <span className="text-sm font-semibold ml-auto">{distribution.todo.count}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-blue-500" />
          <span className="text-sm text-muted-foreground">In Progress</span>
          <span className="text-sm font-semibold ml-auto">{distribution.inProgress.count}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-purple-500" />
          <span className="text-sm text-muted-foreground">In Review</span>
          <span className="text-sm font-semibold ml-auto">{distribution.review.count}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-emerald-500" />
          <span className="text-sm text-muted-foreground">Completed</span>
          <span className="text-sm font-semibold ml-auto">{distribution.done.count}</span>
        </div>
      </div>
    </div>
  )
}

const OverviewTab = ({ currentUser, allMembers, tasks, comments }: OverviewTabProps) => {
  const { setActiveTab, setIsCreateTaskOpen } = useNavigation()
  const onlineMembers = allMembers.filter(m => m.isOnline)
  
  // Calculate statistics
  const stats = useMemo(() => {
    const now = Date.now()
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000
    
    const total = tasks.length
    const completed = tasks.filter(t => t.status === 'done').length
    const inProgress = tasks.filter(t => t.status === 'in-progress').length
    const overdue = tasks.filter(t => t.dueDate && t.dueDate < now && t.status !== 'done').length
    const critical = tasks.filter(t => t.priority === 'critical' && t.status !== 'done').length
    const completedThisWeek = tasks.filter(t => t.status === 'done' && t.updatedAt > oneWeekAgo).length
    const dueThisWeek = tasks.filter(t => t.dueDate && t.dueDate > now && t.dueDate < now + 7 * 24 * 60 * 60 * 1000 && t.status !== 'done').length
    
    return { 
      total, 
      completed, 
      inProgress, 
      overdue, 
      critical,
      completedThisWeek,
      dueThisWeek,
      completionRate: total ? Math.round((completed / total) * 100) : 0 
    }
  }, [tasks])

  const recentTasks = useMemo(() => {
    return (tasks || [])
      .filter(t => t.status !== 'done')
      .sort((a, b) => {
        // Prioritize overdue and critical tasks
        const aOverdue = a.dueDate && a.dueDate < Date.now() ? 1 : 0
        const bOverdue = b.dueDate && b.dueDate < Date.now() ? 1 : 0
        if (aOverdue !== bOverdue) return bOverdue - aOverdue
        
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
        if (a.priority !== b.priority) return priorityOrder[a.priority] - priorityOrder[b.priority]
        
        return b.createdAt - a.createdAt
      })
      .slice(0, 5)
  }, [tasks])

  // Top performers
  const topPerformers = useMemo(() => {
    const memberStats = allMembers.map(member => {
      const memberTasks = tasks.filter(t => t.assigneeId === member.id)
      const completed = memberTasks.filter(t => t.status === 'done').length
      const total = memberTasks.length
      return { member, completed, total, rate: total ? Math.round((completed / total) * 100) : 0 }
    })
    return memberStats.sort((a, b) => b.completed - a.completed).slice(0, 3)
  }, [allMembers, tasks])

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 p-6 md:p-8 text-white">
        <div className="absolute inset-0 bg-grid-white/10" />
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkle size={20} weight="fill" className="text-yellow-300" />
              <span className="text-sm font-medium text-white/80">Welcome back</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Hello, {currentUser.name.split(' ')[0]}! 👋
            </h1>
            <p className="text-white/80 max-w-md">
              You have <span className="font-semibold text-white">{stats.inProgress} tasks</span> in progress 
              and <span className="font-semibold text-white">{stats.dueThisWeek} due this week</span>. 
              {stats.overdue > 0 && <span className="text-yellow-200"> {stats.overdue} task(s) are overdue.</span>}
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="secondary" 
              className="bg-white/20 hover:bg-white/30 text-white border-0"
              onClick={() => setActiveTab('tasks')}
            >
              <CheckSquare size={18} className="mr-2" />
              View Tasks
            </Button>
            <Button 
              className="bg-white text-primary hover:bg-white/90"
              onClick={() => {
                setActiveTab('tasks')
                setIsCreateTaskOpen(true)
              }}
            >
              <Plus size={18} className="mr-2" weight="bold" />
              New Task
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Target}
          label="Total Tasks"
          value={stats.total}
          subValue="tasks"
          gradient="from-blue-600 to-blue-700"
          iconBg="bg-white/20"
        />
        <StatCard
          icon={CheckCircle}
          label="Completed"
          value={stats.completed}
          subValue={`${stats.completionRate}%`}
          trend={{ value: 12, positive: true }}
          gradient="from-emerald-600 to-emerald-700"
          iconBg="bg-white/20"
        />
        <StatCard
          icon={Lightning}
          label="In Progress"
          value={stats.inProgress}
          subValue="active"
          gradient="from-violet-600 to-violet-700"
          iconBg="bg-white/20"
        />
        <StatCard
          icon={stats.overdue > 0 ? Warning : Clock}
          label={stats.overdue > 0 ? "Overdue" : "Due Soon"}
          value={stats.overdue > 0 ? stats.overdue : stats.dueThisWeek}
          subValue={stats.overdue > 0 ? "needs attention" : "this week"}
          gradient={stats.overdue > 0 ? "from-red-600 to-red-700" : "from-amber-600 to-amber-700"}
          iconBg="bg-white/20"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Quick Actions & Distribution */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Rocket size={18} weight="duotone" className="text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <QuickAction
                icon={Plus}
                label="Create Task"
                description="Add a new task to the board"
                variant="primary"
                onClick={() => {
                  setActiveTab('tasks')
                  setIsCreateTaskOpen(true)
                }}
              />
              <QuickAction
                icon={CalendarBlank}
                label="View Calendar"
                description="See upcoming deadlines"
                onClick={() => setActiveTab('calendar')}
              />
              <QuickAction
                icon={Users}
                label="Team Workload"
                description="Balance team assignments"
                onClick={() => setActiveTab('workload')}
              />
            </CardContent>
          </Card>

          {/* Task Distribution */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ChartBar size={18} weight="duotone" className="text-primary" />
                Task Distribution
              </CardTitle>
              <CardDescription>Overview of task statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <TaskDistribution tasks={tasks} />
            </CardContent>
          </Card>

          {/* Your Access Level */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck size={18} weight="duotone" className="text-primary" />
                Your Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                  <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                  <AvatarFallback>{currentUser.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{currentUser.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={cn('text-xs', accessLevelColors[currentUser.accessLevel])}>
                      {accessLevelIcons[currentUser.accessLevel]} {currentUser.accessLevel}
                    </Badge>
                    <Badge variant="secondary" className={cn('text-xs', roleColors[currentUser.role])}>
                      {currentUser.role}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {ACCESS_LEVEL_PERMISSIONS[currentUser.accessLevel]?.slice(0, 3).map((perm, i) => (
                  <div key={i} className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle size={14} className="text-emerald-500" />
                    <span>{perm}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Column - Priority Tasks */}
        <div className="space-y-6">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Fire size={18} weight="duotone" className="text-orange-500" />
                  Priority Tasks
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('tasks')}>
                  View All
                  <ArrowRight size={14} className="ml-1" />
                </Button>
              </div>
              <CardDescription>Tasks that need your attention</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {recentTasks.length > 0 ? (
                  <div className="space-y-3">
                    {recentTasks.map(task => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        teamMembers={allMembers}
                        compact
                        onClick={() => {}}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[200px] text-center">
                    <CheckCircle size={48} className="text-emerald-500 mb-3" />
                    <p className="font-medium">All caught up!</p>
                    <p className="text-sm text-muted-foreground">No pending tasks</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Team & Activity */}
        <div className="space-y-6">
          {/* Team Online */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users size={18} weight="duotone" className="text-primary" />
                  Team Online
                </CardTitle>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                  {onlineMembers.length} online
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {onlineMembers.slice(0, 8).map(member => (
                  <div key={member.id} className="relative group">
                    <Avatar className="h-10 w-10 ring-2 ring-emerald-500 ring-offset-2 ring-offset-background transition-transform hover:scale-110">
                      <AvatarImage src={member.avatarUrl} alt={member.name} />
                      <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover border rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {member.name}
                    </div>
                  </div>
                ))}
                {onlineMembers.length > 8 && (
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                    +{onlineMembers.length - 8}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Performers */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy size={18} weight="duotone" className="text-yellow-500" />
                Top Performers
              </CardTitle>
              <CardDescription>This week's leaders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topPerformers.map((performer, index) => (
                  <div key={performer.member.id} className="flex items-center gap-3">
                    <div className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold",
                      index === 0 ? "bg-yellow-100 text-yellow-700" :
                      index === 1 ? "bg-slate-100 text-slate-700" :
                      "bg-amber-100 text-amber-700"
                    )}>
                      {index + 1}
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={performer.member.avatarUrl} alt={performer.member.name} />
                      <AvatarFallback>{performer.member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{performer.member.name}</p>
                      <p className="text-xs text-muted-foreground">{performer.completed} completed</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {performer.rate}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Overall Progress */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendUp size={18} weight="duotone" className="text-primary" />
                Overall Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Completion Rate</span>
                  <span className="font-semibold">{stats.completionRate}%</span>
                </div>
                <Progress value={stats.completionRate} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {stats.completed} of {stats.total} tasks completed
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default OverviewTab

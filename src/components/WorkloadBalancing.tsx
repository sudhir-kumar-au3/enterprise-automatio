import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  CheckSquare,
  ArrowRight,
  FlagBanner,
  TrendUp,
  TrendDown,
  Equals,
  Sparkle,
  ArrowsLeftRight,
  ChartBar,
  Target,
  Lightning,
  Clock,
  Warning,
  Fire,
  CircleNotch,
  CheckCircle,
  Gauge,
  UserCirclePlus,
  Scales,
  CaretUp,
  CaretDown,
  Circle
} from '@phosphor-icons/react'
import { Task, TeamMember } from '@/lib/collaboration-data'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface WorkloadBalancingProps {
  tasks: Task[]
  teamMembers: TeamMember[]
  onReassignTask: (taskId: string, newAssigneeId: string) => void
}

interface WorkloadStats {
  memberId: string
  member: TeamMember
  totalTasks: number
  activeTasks: number
  criticalTasks: number
  highTasks: number
  overdueTasks: number
  tasksByStatus: {
    todo: number
    'in-progress': number
    review: number
    done: number
  }
  workloadScore: number
}

const calculateWorkloadScore = (stats: Omit<WorkloadStats, 'workloadScore'>): number => {
  const weights = {
    active: 1,
    critical: 3,
    high: 2,
    overdue: 2.5
  }
  
  return (
    stats.activeTasks * weights.active +
    stats.criticalTasks * weights.critical +
    stats.highTasks * weights.high +
    stats.overdueTasks * weights.overdue
  )
}

// Hero stat card component
const HeroStatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  subtext,
  gradient,
  iconGradient
}: { 
  icon: React.ElementType
  label: string
  value: string | number
  subtext?: string
  gradient: string
  iconGradient: string
}) => (
  <Card className={cn(
    "relative overflow-hidden border-0 shadow-xl",
    "bg-gradient-to-br",
    gradient
  )}>
    <div className="absolute inset-0 bg-grid-white/5" />
    <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
    <CardContent className="p-5 relative">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-white/80">{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {subtext && (
            <p className="text-xs text-white/70">{subtext}</p>
          )}
        </div>
        <div className={cn(
          "h-12 w-12 rounded-xl flex items-center justify-center",
          "bg-gradient-to-br shadow-lg",
          iconGradient
        )}>
          <Icon size={24} weight="duotone" className="text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
)

// Workload gauge component
const WorkloadGauge = ({ score, maxScore, avgScore }: { score: number; maxScore: number; avgScore: number }) => {
  const percentage = Math.min((score / maxScore) * 100, 100)
  const ratio = score / avgScore
  
  let color = 'text-emerald-500'
  let bgColor = 'bg-emerald-500'
  let status = 'Optimal'
  
  if (ratio > 1.5) {
    color = 'text-red-500'
    bgColor = 'bg-red-500'
    status = 'Overloaded'
  } else if (ratio > 1.2) {
    color = 'text-amber-500'
    bgColor = 'bg-amber-500'
    status = 'High'
  } else if (ratio < 0.5) {
    color = 'text-blue-500'
    bgColor = 'bg-blue-500'
    status = 'Available'
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Workload</span>
        <span className={cn("font-semibold", color)}>{status}</span>
      </div>
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <motion.div 
          className={cn("h-full rounded-full", bgColor)}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        {/* Average marker */}
        <div 
          className="absolute top-0 h-full w-0.5 bg-foreground/50"
          style={{ left: `${(avgScore / maxScore) * 100}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{score.toFixed(1)} pts</span>
        <span>avg: {avgScore.toFixed(1)}</span>
      </div>
    </div>
  )
}

// Task mini breakdown component
const TaskMiniBreakdown = ({ stats }: { stats: WorkloadStats }) => {
  const items = [
    { label: 'To Do', count: stats.tasksByStatus.todo, color: 'bg-slate-400' },
    { label: 'In Progress', count: stats.tasksByStatus['in-progress'], color: 'bg-blue-500' },
    { label: 'Review', count: stats.tasksByStatus.review, color: 'bg-purple-500' },
    { label: 'Done', count: stats.tasksByStatus.done, color: 'bg-emerald-500' },
  ]
  
  const total = stats.totalTasks || 1
  
  return (
    <div className="space-y-3">
      <div className="flex h-2 rounded-full overflow-hidden bg-muted">
        {items.map((item, i) => item.count > 0 && (
          <motion.div
            key={i}
            className={cn("h-full", item.color)}
            initial={{ width: 0 }}
            animate={{ width: `${(item.count / total) * 100}%` }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1">
        {items.map((item, i) => (
          <TooltipProvider key={i}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center cursor-default">
                  <p className="text-lg font-bold">{item.count}</p>
                  <div className={cn("h-1 w-full rounded-full mx-auto", item.color)} />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{item.label}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  )
}

// Priority indicator component
const PriorityIndicator = ({ critical, high, overdue }: { critical: number; high: number; overdue: number }) => {
  if (critical === 0 && high === 0 && overdue === 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1 rounded-full">
        <CheckCircle size={14} weight="fill" />
        <span>All clear</span>
      </div>
    )
  }
  
  return (
    <div className="flex items-center gap-2">
      {overdue > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 dark:bg-red-950/50 px-2 py-1 rounded-full">
                <Warning size={14} weight="fill" />
                <span>{overdue}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{overdue} overdue task{overdue !== 1 ? 's' : ''}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {critical > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 dark:bg-orange-950/50 px-2 py-1 rounded-full">
                <Fire size={14} weight="fill" />
                <span>{critical}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{critical} critical task{critical !== 1 ? 's' : ''}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {high > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-2 py-1 rounded-full">
                <Lightning size={14} weight="fill" />
                <span>{high}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{high} high priority task{high !== 1 ? 's' : ''}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}

const WorkloadBalancing = ({ tasks, teamMembers, onReassignTask }: WorkloadBalancingProps) => {
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [autoBalanceDialog, setAutoBalanceDialog] = useState(false)
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards')

  const workloadStats = useMemo(() => {
    const now = Date.now()
    
    return teamMembers
      .filter(m => m.isOnline)
      .map(member => {
        const memberTasks = tasks.filter(t => t.assigneeId === member.id)
        const activeTasks = memberTasks.filter(t => t.status !== 'done')
        const criticalTasks = activeTasks.filter(t => t.priority === 'critical')
        const highTasks = activeTasks.filter(t => t.priority === 'high')
        const overdueTasks = activeTasks.filter(t => t.dueDate && t.dueDate < now)
        
        const statsWithoutScore = {
          memberId: member.id,
          member,
          totalTasks: memberTasks.length,
          activeTasks: activeTasks.length,
          criticalTasks: criticalTasks.length,
          highTasks: highTasks.length,
          overdueTasks: overdueTasks.length,
          tasksByStatus: {
            todo: memberTasks.filter(t => t.status === 'todo').length,
            'in-progress': memberTasks.filter(t => t.status === 'in-progress').length,
            review: memberTasks.filter(t => t.status === 'review').length,
            done: memberTasks.filter(t => t.status === 'done').length
          }
        }
        
        return {
          ...statsWithoutScore,
          workloadScore: calculateWorkloadScore(statsWithoutScore)
        }
      })
      .sort((a, b) => b.workloadScore - a.workloadScore)
  }, [tasks, teamMembers])

  const maxWorkload = Math.max(...workloadStats.map(s => s.workloadScore), 1)
  const avgWorkload = workloadStats.length > 0 
    ? workloadStats.reduce((sum, s) => sum + s.workloadScore, 0) / workloadStats.length 
    : 0
  const unassignedTasks = tasks.filter(t => !t.assigneeId && t.status !== 'done')
  
  // Calculate balance score (0-100, higher is better)
  const balanceScore = useMemo(() => {
    if (workloadStats.length < 2) return 100
    const variance = workloadStats.reduce((sum, s) => sum + Math.pow(s.workloadScore - avgWorkload, 2), 0) / workloadStats.length
    const stdDev = Math.sqrt(variance)
    const normalizedStdDev = avgWorkload > 0 ? stdDev / avgWorkload : 0
    return Math.max(0, Math.round(100 - normalizedStdDev * 100))
  }, [workloadStats, avgWorkload])

  const getWorkloadLevel = (score: number): { label: string; color: string; bgColor: string; icon: any } => {
    const ratio = score / avgWorkload
    
    if (ratio > 1.5) {
      return { label: 'Overloaded', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-500', icon: TrendUp }
    } else if (ratio > 1.2) {
      return { label: 'High', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-500', icon: TrendUp }
    } else if (ratio < 0.5) {
      return { label: 'Available', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-500', icon: TrendDown }
    } else {
      return { label: 'Balanced', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-500', icon: Equals }
    }
  }

  const suggestBalancing = () => {
    const suggestions: Array<{
      task: Task
      fromMember: TeamMember | undefined
      toMember: TeamMember
      reason: string
    }> = []

    const overloadedMembers = workloadStats.filter(s => s.workloadScore > avgWorkload * 1.3)
    const underloadedMembers = workloadStats.filter(s => s.workloadScore < avgWorkload * 0.8)

    overloadedMembers.forEach(overloaded => {
      const memberTasks = tasks
        .filter(t => t.assigneeId === overloaded.memberId && t.status !== 'done' && t.status !== 'in-progress')
        .sort((a, b) => {
          const priorityOrder = { low: 0, medium: 1, high: 2, critical: 3 }
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        })

      memberTasks.slice(0, 2).forEach(task => {
        const suitableTarget = underloadedMembers.find(u => 
          u.member.role === overloaded.member.role ||
          (task.priority === 'low' || task.priority === 'medium')
        )

        if (suitableTarget) {
          suggestions.push({
            task,
            fromMember: overloaded.member,
            toMember: suitableTarget.member,
            reason: `Balance workload: ${overloaded.member.name} is overloaded (${overloaded.activeTasks} tasks) while ${suitableTarget.member.name} has capacity (${suitableTarget.activeTasks} tasks)`
          })
        }
      })
    })

    unassignedTasks.slice(0, 3).forEach(task => {
      const bestMatch = [...workloadStats]
        .sort((a, b) => a.workloadScore - b.workloadScore)
        .find(s => s.member.role === 'developer' || task.priority !== 'critical')

      if (bestMatch) {
        suggestions.push({
          task,
          fromMember: undefined,
          toMember: bestMatch.member,
          reason: `Assign to ${bestMatch.member.name} who has the lowest workload (${bestMatch.activeTasks} active tasks)`
        })
      }
    })

    return suggestions.slice(0, 5)
  }

  const applyAutoBalance = () => {
    const suggestions = suggestBalancing()
    let appliedCount = 0

    suggestions.forEach(({ task, toMember }) => {
      onReassignTask(task.id, toMember.id)
      appliedCount++
    })

    setAutoBalanceDialog(false)
    toast.success(`Rebalanced ${appliedCount} task${appliedCount !== 1 ? 's' : ''} across team members`)
  }

  const roleColors: Record<string, string> = {
    architect: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
    developer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    devops: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    product: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'
  }

  const priorityColors: Record<string, string> = {
    low: 'text-blue-600',
    medium: 'text-yellow-600',
    high: 'text-orange-600',
    critical: 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Header with gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-6 md:p-8 text-white">
        <div className="absolute inset-0 bg-grid-white/10" />
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Scales size={20} weight="fill" className="text-violet-200" />
              <span className="text-sm font-medium text-white/80">Team Capacity Manager</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Workload Balancing
            </h1>
            <p className="text-white/80 max-w-md">
              Optimize task distribution across your team for maximum efficiency
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
              <span className="text-xs text-white/70">Balance Score</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{balanceScore}%</span>
                {balanceScore >= 70 ? (
                  <CheckCircle size={20} weight="fill" className="text-emerald-300" />
                ) : (
                  <Warning size={20} weight="fill" className="text-amber-300" />
                )}
              </div>
            </div>
            
            <Dialog open={autoBalanceDialog} onOpenChange={setAutoBalanceDialog}>
              <DialogTrigger asChild>
                <Button className="bg-white text-violet-700 hover:bg-white/90 shadow-lg gap-2">
                  <Sparkle size={18} weight="fill" />
                  Auto-Balance
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <AutoBalanceDialog
                  suggestions={suggestBalancing()}
                  onApply={applyAutoBalance}
                  onClose={() => setAutoBalanceDialog(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroStatCard
          icon={Users}
          label="Active Members"
          value={workloadStats.length}
          subtext="Currently online"
          gradient="from-blue-600 to-blue-700"
          iconGradient="from-blue-400 to-blue-600"
        />
        <HeroStatCard
          icon={CheckSquare}
          label="Unassigned"
          value={unassignedTasks.length}
          subtext={unassignedTasks.length > 0 ? "Need assignment" : "All assigned"}
          gradient="from-amber-500 to-orange-600"
          iconGradient="from-amber-400 to-orange-500"
        />
        <HeroStatCard
          icon={Gauge}
          label="Avg. Workload"
          value={avgWorkload.toFixed(1)}
          subtext="Points per member"
          gradient="from-emerald-600 to-teal-600"
          iconGradient="from-emerald-400 to-teal-500"
        />
        <HeroStatCard
          icon={Target}
          label="Total Active"
          value={tasks.filter(t => t.status !== 'done').length}
          subtext="Tasks in progress"
          gradient="from-violet-600 to-purple-600"
          iconGradient="from-violet-400 to-purple-500"
        />
      </div>

      {/* Team Workload Distribution */}
      <Card className="border shadow-lg overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ChartBar size={20} weight="duotone" className="text-primary" />
                Team Workload Distribution
              </CardTitle>
              <CardDescription>Visual overview of task distribution across team members</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant={viewMode === 'cards' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('cards')}
              >
                Cards
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('list')}
              >
                List
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <AnimatePresence mode="wait">
            {viewMode === 'cards' ? (
              <motion.div 
                key="cards"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid md:grid-cols-2 xl:grid-cols-3 gap-4"
              >
                {workloadStats.map((stats, index) => {
                  const workloadLevel = getWorkloadLevel(stats.workloadScore)
                  const WorkloadIcon = workloadLevel.icon

                  return (
                    <motion.div
                      key={stats.memberId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Card className={cn(
                        "h-full border-2 transition-all duration-300 hover:shadow-xl cursor-pointer group",
                        "hover:border-primary/50"
                      )}
                        onClick={() => setSelectedMember(stats.memberId)}
                      >
                        <CardContent className="p-5 space-y-4">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <Avatar className="h-12 w-12 ring-2 ring-background shadow-md">
                                  <AvatarImage src={stats.member.avatarUrl} alt={stats.member.name} />
                                  <AvatarFallback className="font-semibold">
                                    {stats.member.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div className={cn(
                                  "absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-background",
                                  stats.member.isOnline ? "bg-emerald-500" : "bg-gray-400"
                                )} />
                              </div>
                              <div>
                                <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                                  {stats.member.name}
                                </h3>
                                <Badge variant="secondary" className={cn('text-xs mt-1', roleColors[stats.member.role])}>
                                  {stats.member.role}
                                </Badge>
                              </div>
                            </div>
                            <Badge className={cn(
                              'text-xs gap-1 shrink-0',
                              workloadLevel.color,
                              'bg-opacity-10 border',
                              workloadLevel.bgColor.replace('bg-', 'border-').replace('500', '200')
                            )}>
                              <WorkloadIcon size={12} weight="bold" />
                              {workloadLevel.label}
                            </Badge>
                          </div>

                          {/* Workload Gauge */}
                          <WorkloadGauge 
                            score={stats.workloadScore} 
                            maxScore={maxWorkload} 
                            avgScore={avgWorkload}
                          />

                          {/* Task Breakdown */}
                          <TaskMiniBreakdown stats={stats} />

                          {/* Priority Indicators */}
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-xs text-muted-foreground">Priority alerts</span>
                            <PriorityIndicator 
                              critical={stats.criticalTasks}
                              high={stats.highTasks}
                              overdue={stats.overdueTasks}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </motion.div>
            ) : (
              <motion.div 
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                {workloadStats.map((stats, index) => {
                  const workloadLevel = getWorkloadLevel(stats.workloadScore)
                  const percentage = (stats.workloadScore / maxWorkload) * 100

                  return (
                    <motion.div
                      key={stats.memberId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border-2 transition-all",
                        "hover:border-primary/50 hover:bg-muted/30 cursor-pointer"
                      )}
                      onClick={() => setSelectedMember(stats.memberId)}
                    >
                      <div className="flex items-center gap-3 w-48 shrink-0">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={stats.member.avatarUrl} alt={stats.member.name} />
                          <AvatarFallback>{stats.member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{stats.member.name}</p>
                          <Badge variant="secondary" className={cn('text-xs', roleColors[stats.member.role])}>
                            {stats.member.role}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground w-16">{stats.workloadScore.toFixed(1)} pts</span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <motion.div 
                              className={cn("h-full rounded-full", workloadLevel.bgColor)}
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-sm shrink-0">
                        <div className="text-center">
                          <p className="font-bold">{stats.activeTasks}</p>
                          <p className="text-xs text-muted-foreground">Active</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold">{stats.tasksByStatus.done}</p>
                          <p className="text-xs text-muted-foreground">Done</p>
                        </div>
                        <PriorityIndicator 
                          critical={stats.criticalTasks}
                          high={stats.highTasks}
                          overdue={stats.overdueTasks}
                        />
                      </div>

                      <ArrowRight size={18} className="text-muted-foreground" />
                    </motion.div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Unassigned Tasks */}
      {unassignedTasks.length > 0 && (
        <Card className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 shadow-lg overflow-hidden">
          <CardHeader className="border-b border-amber-200/50 dark:border-amber-800/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <UserCirclePlus size={20} weight="duotone" />
                  Unassigned Tasks
                </CardTitle>
                <CardDescription>
                  {unassignedTasks.length} task{unassignedTasks.length !== 1 ? 's' : ''} waiting to be assigned
                </CardDescription>
              </div>
              <Badge className="bg-amber-500 text-white">
                {unassignedTasks.length} pending
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {unassignedTasks.slice(0, 6).map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className={cn(
                    "flex items-center gap-3 p-3 bg-card rounded-lg border-2 border-transparent",
                    "hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
                  )}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                    task.priority === 'critical' && "bg-red-100 dark:bg-red-900/50",
                    task.priority === 'high' && "bg-orange-100 dark:bg-orange-900/50",
                    task.priority === 'medium' && "bg-yellow-100 dark:bg-yellow-900/50",
                    task.priority === 'low' && "bg-blue-100 dark:bg-blue-900/50"
                  )}>
                    <FlagBanner size={16} weight="fill" className={cn(priorityColors[task.priority])} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <Badge variant="outline" className="text-xs mt-1">
                      {task.priority}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
            {unassignedTasks.length > 6 && (
              <div className="mt-4 text-center">
                <Button variant="outline" className="gap-2">
                  View all {unassignedTasks.length} unassigned tasks
                  <ArrowRight size={14} />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Member Details Dialog */}
      <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent className="max-w-2xl">
          {selectedMember && (
            <MemberWorkloadDetails
              stats={workloadStats.find(s => s.memberId === selectedMember)!}
              tasks={tasks.filter(t => t.assigneeId === selectedMember)}
              avgWorkload={avgWorkload}
              maxWorkload={maxWorkload}
              onClose={() => setSelectedMember(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface AutoBalanceDialogProps {
  suggestions: Array<{
    task: Task
    fromMember: TeamMember | undefined
    toMember: TeamMember
    reason: string
  }>
  onApply: () => void
  onClose: () => void
}

const AutoBalanceDialog = ({ suggestions, onApply, onClose }: AutoBalanceDialogProps) => {
  const priorityColors: Record<string, string> = {
    low: 'text-blue-600',
    medium: 'text-yellow-600',
    high: 'text-orange-600',
    critical: 'text-red-600'
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Sparkle size={20} weight="fill" className="text-white" />
          </div>
          <div>
            <span>Auto-Balance Workload</span>
            <p className="text-sm font-normal text-muted-foreground">
              AI-powered task distribution suggestions
            </p>
          </div>
        </DialogTitle>
      </DialogHeader>

      <ScrollArea className="max-h-[60vh] pr-4">
        {suggestions.length === 0 ? (
          <div className="py-12 text-center">
            <div className="h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-900/50 mx-auto mb-4 flex items-center justify-center">
              <Target size={40} className="text-emerald-600" weight="duotone" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Workload is Balanced!</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Your team's workload is evenly distributed. No rebalancing needed at this time.
            </p>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            <div className="flex items-center gap-2 p-3 bg-violet-50 dark:bg-violet-950/30 rounded-lg border border-violet-200 dark:border-violet-800">
              <Sparkle size={18} className="text-violet-600" />
              <span className="text-sm text-violet-700 dark:text-violet-300">
                {suggestions.length} optimization{suggestions.length !== 1 ? 's' : ''} found to improve team balance
              </span>
            </div>
            
            {suggestions.map((suggestion, index) => (
              <motion.div
                key={`${suggestion.task.id}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <Card className="border-2 hover:border-primary/50 transition-all">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                        suggestion.task.priority === 'critical' && "bg-red-100 dark:bg-red-900/50",
                        suggestion.task.priority === 'high' && "bg-orange-100 dark:bg-orange-900/50",
                        suggestion.task.priority === 'medium' && "bg-yellow-100 dark:bg-yellow-900/50",
                        suggestion.task.priority === 'low' && "bg-blue-100 dark:bg-blue-900/50"
                      )}>
                        <FlagBanner size={16} weight="fill" className={cn(priorityColors[suggestion.task.priority])} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-2">{suggestion.task.title}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {suggestion.task.priority} priority
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-3 py-2">
                      {suggestion.fromMember ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={suggestion.fromMember.avatarUrl} />
                            <AvatarFallback className="text-xs">
                              {suggestion.fromMember.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-muted-foreground">{suggestion.fromMember.name}</span>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Unassigned</Badge>
                      )}
                      
                      <div className="flex items-center gap-1 px-3 py-1 bg-primary/10 rounded-full">
                        <ArrowRight size={14} className="text-primary" />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8 ring-2 ring-primary/50">
                          <AvatarImage src={suggestion.toMember.avatarUrl} />
                          <AvatarFallback className="text-xs">
                            {suggestion.toMember.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{suggestion.toMember.name}</span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
                      💡 {suggestion.reason}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        {suggestions.length > 0 && (
          <Button onClick={onApply} className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
            <Sparkle size={16} weight="fill" />
            Apply {suggestions.length} Change{suggestions.length !== 1 ? 's' : ''}
          </Button>
        )}
      </div>
    </>
  )
}

interface MemberWorkloadDetailsProps {
  stats: WorkloadStats
  tasks: Task[]
  avgWorkload: number
  maxWorkload: number
  onClose: () => void
}

const MemberWorkloadDetails = ({ stats, tasks, avgWorkload, maxWorkload, onClose }: MemberWorkloadDetailsProps) => {
  const activeTasks = tasks.filter(t => t.status !== 'done')
  const completedTasks = tasks.filter(t => t.status === 'done')
  const now = Date.now()

  const priorityColors: Record<string, string> = {
    low: 'text-blue-600',
    medium: 'text-yellow-600',
    high: 'text-orange-600',
    critical: 'text-red-600'
  }

  const statusConfig: Record<string, { color: string; icon: React.ElementType }> = {
    todo: { color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', icon: Circle },
    'in-progress': { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300', icon: CircleNotch },
    review: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300', icon: Clock },
    done: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300', icon: CheckCircle }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <Avatar className="h-12 w-12 ring-2 ring-primary/20">
            <AvatarImage src={stats.member.avatarUrl} />
            <AvatarFallback>{stats.member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
          </Avatar>
          <div>
            <span>{stats.member.name}</span>
            <p className="text-sm font-normal text-muted-foreground">
              {stats.member.email}
            </p>
          </div>
        </DialogTitle>
      </DialogHeader>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-3 py-4">
        {[
          { label: 'To Do', count: stats.tasksByStatus.todo, color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800' },
          { label: 'In Progress', count: stats.tasksByStatus['in-progress'], color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/50' },
          { label: 'Review', count: stats.tasksByStatus.review, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/50' },
          { label: 'Done', count: stats.tasksByStatus.done, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/50' },
        ].map((item, i) => (
          <Card key={i} className={cn("border-0", item.bg)}>
            <CardContent className="pt-4 text-center">
              <p className={cn("text-2xl font-bold", item.color)}>{item.count}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Workload Gauge */}
      <Card className="border-2">
        <CardContent className="p-4">
          <WorkloadGauge 
            score={stats.workloadScore} 
            maxScore={maxWorkload}
            avgScore={avgWorkload}
          />
        </CardContent>
      </Card>

      {/* Active Tasks */}
      <div className="space-y-3 mt-4">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Lightning size={16} weight="duotone" className="text-primary" />
          Active Tasks ({activeTasks.length})
        </h4>
        <ScrollArea className="max-h-[300px]">
          {activeTasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle size={40} className="mx-auto text-emerald-500 mb-2" />
              <p className="text-sm text-muted-foreground">No active tasks</p>
            </div>
          ) : (
            <div className="space-y-2 pr-4">
              {activeTasks.map(task => {
                const isOverdue = task.dueDate && task.dueDate < now
                const StatusIcon = statusConfig[task.status].icon
                return (
                  <Card key={task.id} className={cn(
                    "border-l-4 hover:shadow-md transition-shadow",
                    task.priority === 'critical' && "border-l-red-500",
                    task.priority === 'high' && "border-l-orange-500",
                    task.priority === 'medium' && "border-l-yellow-500",
                    task.priority === 'low' && "border-l-blue-500"
                  )}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <FlagBanner size={16} weight="fill" className={cn(priorityColors[task.priority], 'mt-0.5 shrink-0')} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium line-clamp-1">{task.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={cn('text-xs gap-1', statusConfig[task.status].color)}>
                                <StatusIcon size={10} weight="bold" />
                                {task.status.replace('-', ' ')}
                              </Badge>
                              {isOverdue && (
                                <Badge variant="destructive" className="text-xs gap-1">
                                  <Warning size={10} weight="fill" />
                                  Overdue
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button onClick={onClose}>Close</Button>
      </div>
    </>
  )
}

export default WorkloadBalancing

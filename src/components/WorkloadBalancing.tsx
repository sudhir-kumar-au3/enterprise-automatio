import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { motion } from 'framer-motion'
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
  Target
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

const WorkloadBalancing = ({ tasks, teamMembers, onReassignTask }: WorkloadBalancingProps) => {
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [autoBalanceDialog, setAutoBalanceDialog] = useState(false)

  const calculateWorkloadStats = (): WorkloadStats[] => {
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
  }

  const workloadStats = calculateWorkloadStats()
  const maxWorkload = Math.max(...workloadStats.map(s => s.workloadScore), 1)
  const avgWorkload = workloadStats.reduce((sum, s) => sum + s.workloadScore, 0) / workloadStats.length
  const unassignedTasks = tasks.filter(t => !t.assigneeId && t.status !== 'done')

  const getWorkloadLevel = (score: number): { label: string; color: string; icon: any } => {
    const ratio = score / avgWorkload
    
    if (ratio > 1.5) {
      return { label: 'Overloaded', color: 'text-red-600 dark:text-red-400', icon: TrendUp }
    } else if (ratio > 1.2) {
      return { label: 'High', color: 'text-orange-600 dark:text-orange-400', icon: TrendUp }
    } else if (ratio < 0.7) {
      return { label: 'Low', color: 'text-blue-600 dark:text-blue-400', icon: TrendDown }
    } else {
      return { label: 'Balanced', color: 'text-green-600 dark:text-green-400', icon: Equals }
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

  const priorityColors = {
    low: 'text-blue-600',
    medium: 'text-yellow-600',
    high: 'text-orange-600',
    critical: 'text-red-600'
  }

  const roleColors = {
    architect: 'bg-purple-500/10 text-purple-700',
    developer: 'bg-blue-500/10 text-blue-700',
    devops: 'bg-green-500/10 text-green-700',
    product: 'bg-orange-500/10 text-orange-700'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Workload Balancing
          </h3>
          <p className="text-muted-foreground mt-1">
            Distribute tasks evenly and optimize team capacity
          </p>
        </div>
        <Dialog open={autoBalanceDialog} onOpenChange={setAutoBalanceDialog}>
          <DialogTrigger asChild>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button className="gap-2 shadow-lg hover:shadow-xl transition-all">
                <Sparkle size={18} weight="fill" />
                Auto-Balance
              </Button>
            </motion.div>
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

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Users size={24} weight="duotone" className="text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Team Members</p>
                <p className="text-2xl font-bold">{workloadStats.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-accent/10 rounded-xl">
                <CheckSquare size={24} weight="duotone" className="text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unassigned Tasks</p>
                <p className="text-2xl font-bold">{unassignedTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <Target size={24} weight="duotone" className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Workload</p>
                <p className="text-2xl font-bold">{avgWorkload.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {workloadStats.map((stats, index) => {
          const workloadLevel = getWorkloadLevel(stats.workloadScore)
          const WorkloadIcon = workloadLevel.icon
          const percentage = (stats.workloadScore / maxWorkload) * 100

          return (
            <motion.div
              key={stats.memberId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className="shadow-lg hover:shadow-xl transition-all duration-300 group relative overflow-hidden">
                <div className={cn(
                  "absolute top-0 right-0 w-32 h-32 opacity-5 blur-3xl rounded-full transition-opacity group-hover:opacity-10",
                  workloadLevel.color.includes('red') && "bg-red-500",
                  workloadLevel.color.includes('orange') && "bg-orange-500",
                  workloadLevel.color.includes('green') && "bg-green-500",
                  workloadLevel.color.includes('blue') && "bg-blue-500"
                )} />
                
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 ring-2 ring-background shadow-md">
                        <AvatarImage src={stats.member.avatarUrl} alt={stats.member.name} />
                        <AvatarFallback>{stats.member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {stats.member.name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {stats.member.email}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary" className={cn('text-xs', roleColors[stats.member.role])}>
                        {stats.member.role}
                      </Badge>
                      <Badge className={cn('text-xs gap-1', workloadLevel.color)}>
                        <WorkloadIcon size={12} weight="bold" />
                        {workloadLevel.label}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Workload Score</span>
                      <span className="font-bold">{stats.workloadScore.toFixed(1)}</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Active</span>
                      <Badge variant="outline" className="font-semibold">{stats.activeTasks}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total</span>
                      <Badge variant="outline" className="font-semibold">{stats.totalTasks}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <FlagBanner size={12} weight="fill" className="text-red-600" />
                        Critical
                      </span>
                      <Badge variant="outline" className="font-semibold text-red-600">{stats.criticalTasks}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <FlagBanner size={12} weight="fill" className="text-orange-600" />
                        High
                      </span>
                      <Badge variant="outline" className="font-semibold text-orange-600">{stats.highTasks}</Badge>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => setSelectedMember(stats.memberId)}
                  >
                    <ChartBar size={16} weight="duotone" />
                    View Details
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {unassignedTasks.length > 0 && (
        <Card className="border-orange-500/30 bg-orange-50/50 dark:bg-orange-950/20 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <CheckSquare size={20} weight="duotone" />
              Unassigned Tasks ({unassignedTasks.length})
            </CardTitle>
            <CardDescription>
              These tasks need to be assigned to team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unassignedTasks.slice(0, 5).map(task => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-3 p-3 bg-card rounded-lg border"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FlagBanner size={16} weight="fill" className={cn(priorityColors[task.priority])} />
                    <span className="text-sm font-medium truncate">{task.title}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {task.priority}
                  </Badge>
                </div>
              ))}
              {unassignedTasks.length > 5 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  +{unassignedTasks.length - 5} more unassigned tasks
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        {selectedMember && (
          <MemberWorkloadDetails
            stats={workloadStats.find(s => s.memberId === selectedMember)!}
            tasks={tasks.filter(t => t.assigneeId === selectedMember)}
            onClose={() => setSelectedMember(null)}
          />
        )}
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
  const priorityColors = {
    low: 'text-blue-600',
    medium: 'text-yellow-600',
    high: 'text-orange-600',
    critical: 'text-red-600'
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-lg">
            <Sparkle size={20} weight="fill" className="text-white" />
          </div>
          Auto-Balance Workload
        </DialogTitle>
        <DialogDescription>
          Review suggested task reassignments to balance workload across your team
        </DialogDescription>
      </DialogHeader>

      <ScrollArea className="max-h-[60vh] pr-4">
        {suggestions.length === 0 ? (
          <div className="py-12 text-center">
            <Target size={48} className="mx-auto text-green-500 mb-3" weight="duotone" />
            <h3 className="font-semibold text-lg mb-1">Workload is Balanced!</h3>
            <p className="text-sm text-muted-foreground">
              Your team's workload is evenly distributed. No rebalancing needed.
            </p>
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">
              {suggestions.length} suggested change{suggestions.length !== 1 ? 's' : ''}:
            </p>
            {suggestions.map((suggestion, index) => (
              <motion.div
                key={`${suggestion.task.id}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="border-2 hover:border-primary/50 transition-colors">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <FlagBanner size={16} weight="fill" className={cn(priorityColors[suggestion.task.priority], 'mt-0.5')} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm line-clamp-2">{suggestion.task.title}</p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {suggestion.task.priority} priority
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        {suggestion.fromMember ? (
                          <>
                            <Avatar className="h-6 w-6 ring-1 ring-background">
                              <AvatarImage src={suggestion.fromMember.avatarUrl} />
                              <AvatarFallback className="text-xs">
                                {suggestion.fromMember.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-muted-foreground">{suggestion.fromMember.name}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                        
                        <ArrowsLeftRight size={16} className="text-primary" weight="bold" />
                        
                        <Avatar className="h-6 w-6 ring-1 ring-background">
                          <AvatarImage src={suggestion.toMember.avatarUrl} />
                          <AvatarFallback className="text-xs">
                            {suggestion.toMember.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{suggestion.toMember.name}</span>
                      </div>

                      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        {suggestion.reason}
                      </p>
                    </div>
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
          <Button onClick={onApply} className="gap-2">
            <Sparkle size={16} weight="fill" />
            Apply Changes
          </Button>
        )}
      </div>
    </>
  )
}

interface MemberWorkloadDetailsProps {
  stats: WorkloadStats
  tasks: Task[]
  onClose: () => void
}

const MemberWorkloadDetails = ({ stats, tasks, onClose }: MemberWorkloadDetailsProps) => {
  const activeTasks = tasks.filter(t => t.status !== 'done')
  const now = Date.now()

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

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Avatar className="h-10 w-10 ring-2 ring-background">
            <AvatarImage src={stats.member.avatarUrl} />
            <AvatarFallback>{stats.member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
          </Avatar>
          {stats.member.name}'s Workload
        </DialogTitle>
        <DialogDescription>
          Detailed breakdown of tasks and workload distribution
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-4 gap-3 py-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-gray-600">{stats.tasksByStatus.todo}</p>
            <p className="text-xs text-muted-foreground">To Do</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.tasksByStatus['in-progress']}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.tasksByStatus.review}</p>
            <p className="text-xs text-muted-foreground">Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.tasksByStatus.done}</p>
            <p className="text-xs text-muted-foreground">Done</p>
          </CardContent>
        </Card>
      </div>

      <ScrollArea className="max-h-[50vh]">
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Active Tasks ({activeTasks.length})</h4>
          {activeTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No active tasks
            </p>
          ) : (
            activeTasks.map(task => {
              const isOverdue = task.dueDate && task.dueDate < now
              return (
                <Card key={task.id} className={cn(
                  "border-l-4",
                  task.priority === 'critical' && "border-l-red-500",
                  task.priority === 'high' && "border-l-orange-500",
                  task.priority === 'medium' && "border-l-yellow-500",
                  task.priority === 'low' && "border-l-blue-500"
                )}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <FlagBanner size={16} weight="fill" className={cn(priorityColors[task.priority], 'mt-0.5')} />
                        <p className="text-sm font-medium line-clamp-2">{task.title}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn('text-xs', statusColors[task.status])}>
                        {task.status.replace('-', ' ')}
                      </Badge>
                      {isOverdue && (
                        <Badge variant="outline" className="text-xs text-red-600 border-red-600">
                          Overdue
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </ScrollArea>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button onClick={onClose}>Close</Button>
      </div>
    </>
  )
}

export default WorkloadBalancing

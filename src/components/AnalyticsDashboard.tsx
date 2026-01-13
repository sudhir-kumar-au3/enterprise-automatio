import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Task, TeamMember, Comment } from '@/lib/collaboration-data';
import { useAI } from '@/contexts/PowerFeaturesContext';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  PieChart,
  Activity,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Zap,
  Target,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  RefreshCw,
  Download,
  Filter,
  Loader2,
  Brain,
  Lightbulb,
  Shield,
  Flame,
  Trophy,
  Star,
  MessageSquare
} from 'lucide-react';

interface AnalyticsDashboardProps {
  tasks: Task[];
  teamMembers: TeamMember[];
  comments: Comment[];
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}

const MetricCard = ({ title, value, change, changeLabel, icon, trend, color = 'primary' }: MetricCardProps) => {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground';

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {change !== undefined && (
              <div className={cn("flex items-center gap-1 text-sm", trendColor)}>
                <TrendIcon className="h-4 w-4" />
                <span>{change > 0 ? '+' : ''}{change}%</span>
                {changeLabel && <span className="text-muted-foreground">vs {changeLabel}</span>}
              </div>
            )}
          </div>
          <div className={cn(
            "h-12 w-12 rounded-xl flex items-center justify-center",
            `bg-${color}/10`
          )}>
            {icon}
          </div>
        </div>
      </CardContent>
      <div className={cn("absolute bottom-0 left-0 right-0 h-1", `bg-${color}`)} />
    </Card>
  );
};

export function AnalyticsDashboard({ tasks, teamMembers, comments }: AnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { insights, isAnalyzing, generateInsights, analyzeWorkload, predictDeadlineRisk } = useAI();

  // Calculate metrics
  const metrics = useMemo(() => {
    const now = Date.now();
    const timeRangeMs = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      'all': Infinity,
    }[timeRange];

    const filteredTasks = tasks.filter(t => now - t.createdAt < timeRangeMs);
    const previousPeriodTasks = tasks.filter(t => {
      const age = now - t.createdAt;
      return age >= timeRangeMs && age < timeRangeMs * 2;
    });

    const totalTasks = filteredTasks.length;
    const completedTasks = filteredTasks.filter(t => t.status === 'done').length;
    const inProgressTasks = filteredTasks.filter(t => t.status === 'in-progress').length;
    const overdueTasks = filteredTasks.filter(t => t.dueDate && t.dueDate < now && t.status !== 'done').length;
    
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const previousCompletionRate = previousPeriodTasks.length > 0 
      ? Math.round((previousPeriodTasks.filter(t => t.status === 'done').length / previousPeriodTasks.length) * 100)
      : 0;

    // Average time to complete (for completed tasks with dueDate)
    const completedWithDates = filteredTasks.filter(t => t.status === 'done' && t.dueDate);
    const avgCompletionTime = completedWithDates.length > 0
      ? Math.round(completedWithDates.reduce((acc, t) => acc + (t.updatedAt - t.createdAt), 0) / completedWithDates.length / (1000 * 60 * 60 * 24))
      : 0;

    // Tasks by priority
    const tasksByPriority = {
      critical: filteredTasks.filter(t => t.priority === 'critical').length,
      high: filteredTasks.filter(t => t.priority === 'high').length,
      medium: filteredTasks.filter(t => t.priority === 'medium').length,
      low: filteredTasks.filter(t => t.priority === 'low').length,
    };

    // Tasks by status
    const tasksByStatus = {
      todo: filteredTasks.filter(t => t.status === 'todo').length,
      'in-progress': inProgressTasks,
      review: filteredTasks.filter(t => t.status === 'review').length,
      done: completedTasks,
    };

    // Team productivity
    const teamProductivity = teamMembers.map(member => {
      const memberTasks = filteredTasks.filter(t => t.assigneeId === member.id);
      const completed = memberTasks.filter(t => t.status === 'done').length;
      const total = memberTasks.length;
      return {
        member,
        total,
        completed,
        inProgress: memberTasks.filter(t => t.status === 'in-progress').length,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    }).sort((a, b) => b.completionRate - a.completionRate);

    // Activity over time (simplified for demo)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now - (6 - i) * 24 * 60 * 60 * 1000);
      const dayTasks = filteredTasks.filter(t => {
        const taskDate = new Date(t.createdAt);
        return taskDate.toDateString() === date.toDateString();
      });
      return {
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        created: dayTasks.length,
        completed: dayTasks.filter(t => t.status === 'done').length,
      };
    });

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      completionRate,
      completionRateChange: completionRate - previousCompletionRate,
      avgCompletionTime,
      tasksByPriority,
      tasksByStatus,
      teamProductivity,
      activityData: last7Days,
      activeMembers: teamMembers.filter(m => m.isOnline).length,
      totalComments: comments.length,
    };
  }, [tasks, teamMembers, comments, timeRange]);

  // Workload analysis
  const workloadAnalysis = useMemo(() => {
    return analyzeWorkload(tasks, teamMembers);
  }, [tasks, teamMembers, analyzeWorkload]);

  // At-risk tasks
  const atRiskTasks = useMemo(() => {
    return tasks
      .filter(t => t.status !== 'done')
      .map(task => ({
        task,
        risk: predictDeadlineRisk(task),
      }))
      .filter(({ risk }) => risk.riskLevel === 'high' || risk.riskLevel === 'critical')
      .sort((a, b) => b.risk.probability - a.risk.probability)
      .slice(0, 5);
  }, [tasks, predictDeadlineRisk]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await generateInsights();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const priorityColors = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
  };

  const statusColors = {
    todo: 'bg-slate-500 dark:bg-slate-400',
    'in-progress': 'bg-blue-500',
    review: 'bg-purple-500',
    done: 'bg-green-500',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Comprehensive insights into your team's performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={(v: typeof timeRange) => setTimeRange(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Tasks"
          value={metrics.totalTasks}
          icon={<CheckCircle2 className="h-6 w-6 text-primary" />}
          color="primary"
        />
        <MetricCard
          title="Completion Rate"
          value={`${metrics.completionRate}%`}
          change={metrics.completionRateChange}
          changeLabel="last period"
          icon={<Target className="h-6 w-6 text-green-600" />}
          trend={metrics.completionRateChange > 0 ? 'up' : metrics.completionRateChange < 0 ? 'down' : 'neutral'}
          color="green-500"
        />
        <MetricCard
          title="In Progress"
          value={metrics.inProgressTasks}
          icon={<Activity className="h-6 w-6 text-blue-600" />}
          color="blue-500"
        />
        <MetricCard
          title="Overdue Tasks"
          value={metrics.overdueTasks}
          icon={<AlertTriangle className="h-6 w-6 text-red-600" />}
          trend={metrics.overdueTasks > 0 ? 'down' : 'neutral'}
          color="red-500"
        />
      </div>

      {/* AI Insights Banner */}
      {insights.filter(i => !i.dismissed).length > 0 && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-purple-500/5 to-pink-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Insights
              </CardTitle>
              <Badge variant="secondary" className="gap-1">
                <Brain className="h-3 w-3" />
                {insights.filter(i => !i.dismissed).length} insights
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {insights.filter(i => !i.dismissed).slice(0, 3).map(insight => (
                <div
                  key={insight.id}
                  className={cn(
                    "p-3 rounded-lg border",
                    insight.type === 'warning' && "bg-orange-50 border-orange-200 dark:bg-orange-950/20",
                    insight.type === 'optimization' && "bg-blue-50 border-blue-200 dark:bg-blue-950/20",
                    insight.type === 'suggestion' && "bg-green-50 border-green-200 dark:bg-green-950/20",
                    insight.type === 'prediction' && "bg-purple-50 border-purple-200 dark:bg-purple-950/20"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <Lightbulb className={cn(
                      "h-4 w-4 mt-0.5 flex-shrink-0",
                      insight.type === 'warning' && "text-orange-600",
                      insight.type === 'optimization' && "text-blue-600",
                      insight.type === 'suggestion' && "text-green-600",
                      insight.type === 'prediction' && "text-purple-600"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{insight.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {insight.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {Math.round(insight.confidence * 100)}% confidence
                        </Badge>
                        {insight.actionable && (
                          <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                            {insight.actionLabel || 'Take Action'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Task Distribution</CardTitle>
              <CardDescription>Tasks breakdown by status and priority</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-6">
                {/* By Status */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">By Status</h4>
                  <div className="space-y-3">
                    {Object.entries(metrics.tasksByStatus).map(([status, count]) => (
                      <div key={status} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="capitalize">{status.replace('-', ' ')}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", statusColors[status as keyof typeof statusColors])}
                            style={{ width: `${metrics.totalTasks > 0 ? (count / metrics.totalTasks) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* By Priority */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">By Priority</h4>
                  <div className="space-y-3">
                    {Object.entries(metrics.tasksByPriority).map(([priority, count]) => (
                      <div key={priority} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="capitalize">{priority}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", priorityColors[priority as keyof typeof priorityColors])}
                            style={{ width: `${metrics.totalTasks > 0 ? (count / metrics.totalTasks) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Chart (Simplified) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Weekly Activity</CardTitle>
              <CardDescription>Tasks created and completed over the last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-40">
                {metrics.activityData.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex gap-1 items-end h-28">
                      <div
                        className="flex-1 bg-primary/20 rounded-t transition-all hover:bg-primary/30"
                        style={{ height: `${Math.max((day.created / Math.max(...metrics.activityData.map(d => d.created), 1)) * 100, 4)}%` }}
                        title={`Created: ${day.created}`}
                      />
                      <div
                        className="flex-1 bg-green-500/60 rounded-t transition-all hover:bg-green-500/80"
                        style={{ height: `${Math.max((day.completed / Math.max(...metrics.activityData.map(d => d.completed), 1)) * 100, 4)}%` }}
                        title={`Completed: ${day.completed}`}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{day.date}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-primary/20" />
                  <span className="text-xs text-muted-foreground">Created</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-green-500/60" />
                  <span className="text-xs text-muted-foreground">Completed</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Workload Balance */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Workload Balance</CardTitle>
                  <CardDescription>Team workload distribution analysis</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Balance Score</span>
                  <Badge 
                    variant={workloadAnalysis.balanceScore >= 70 ? 'default' : 'destructive'}
                    className="text-lg px-3"
                  >
                    {workloadAnalysis.balanceScore}%
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workloadAnalysis.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Shield className={cn(
                      "h-4 w-4 mt-0.5 flex-shrink-0",
                      rec.includes('well-balanced') ? 'text-green-600' : 'text-orange-600'
                    )} />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Team & Insights */}
        <div className="space-y-6">
          {/* Team Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Team Leaderboard
              </CardTitle>
              <CardDescription>Top performers by completion rate</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {metrics.teamProductivity.slice(0, 10).map((item, index) => (
                    <div
                      key={item.member.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg",
                        index === 0 && "bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800",
                        index === 1 && "bg-slate-50 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700",
                        index === 2 && "bg-orange-50 border border-orange-200 dark:bg-orange-950/30 dark:border-orange-800",
                        index > 2 && "hover:bg-muted/50"
                      )}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={item.member.avatarUrl} />
                          <AvatarFallback>
                            {item.member.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        {index < 3 && (
                          <div className={cn(
                            "absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold",
                            index === 0 && "bg-yellow-500 text-yellow-950",
                            index === 1 && "bg-gray-400 text-white",
                            index === 2 && "bg-orange-500 text-white"
                          )}>
                            {index + 1}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.member.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.completed}/{item.total} tasks • {item.inProgress} in progress
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{item.completionRate}%</p>
                        <div className="flex items-center gap-1">
                          {item.completionRate >= 80 && <Flame className="h-3 w-3 text-orange-500" />}
                          {item.completionRate >= 90 && <Star className="h-3 w-3 text-yellow-500" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* At-Risk Tasks */}
          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-orange-600">
                <AlertTriangle className="h-4 w-4" />
                At-Risk Tasks
              </CardTitle>
              <CardDescription>Tasks that may miss their deadline</CardDescription>
            </CardHeader>
            <CardContent>
              {atRiskTasks.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
                  <p className="text-sm text-muted-foreground">All tasks are on track!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {atRiskTasks.map(({ task, risk }) => (
                    <div
                      key={task.id}
                      className={cn(
                        "p-3 rounded-lg border",
                        risk.riskLevel === 'critical' ? "bg-red-50 border-red-200 dark:bg-red-950/20" : "bg-orange-50 border-orange-200 dark:bg-orange-950/20"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{task.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {risk.factors[0]}
                          </p>
                        </div>
                        <Badge variant={risk.riskLevel === 'critical' ? 'destructive' : 'secondary'}>
                          {Math.round(risk.probability * 100)}% risk
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        💡 {risk.suggestion}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Team Members</span>
                </div>
                <span className="font-medium">{teamMembers.length}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Online Now</span>
                </div>
                <span className="font-medium text-green-600">{metrics.activeMembers}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Avg. Completion Time</span>
                </div>
                <span className="font-medium">{metrics.avgCompletionTime} days</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Total Comments</span>
                </div>
                <span className="font-medium">{metrics.totalComments}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;

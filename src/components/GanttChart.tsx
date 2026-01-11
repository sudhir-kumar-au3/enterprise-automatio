import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Task, TeamMember } from '@/lib/collaboration-data'
import { RoadmapPhase, RoadmapTask } from '@/lib/architecture-data'
import { cn } from '@/lib/utils'
import { CalendarBlank, Warning, CheckCircle, Clock, ArrowRight, ArrowsOutLineHorizontal, ArrowsInLineHorizontal } from '@phosphor-icons/react'

interface GanttChartProps {
  phases: RoadmapPhase[]
  tasks?: Task[]
  teamMembers?: TeamMember[]
  showTasks?: boolean
}

type ViewMode = 'phases' | 'tasks' | 'combined'

interface PhaseGanttItem {
  type: 'phase'
  id: string
  name: string
  phase: number
  priority: 'critical' | 'high' | 'medium'
  start: number
  end: number
  duration: number
  status: 'pending' | 'in-progress' | 'completed'
  dependencies: string[]
  tasks: RoadmapTask[]
  outcomes: string[]
}

interface TaskGanttItem {
  type: 'task'
  id: string
  name: string
  phaseId: string
  phaseName: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  start: number
  end: number
  duration: number
  status: string
  effort?: string
  owner?: string
  assigneeId?: string
  dependencies: string[]
}

type GanttItem = PhaseGanttItem | TaskGanttItem

const priorityColors = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-blue-500',
  low: 'bg-green-500'
}

const statusColors = {
  pending: 'bg-gray-400',
  'in-progress': 'bg-blue-500',
  completed: 'bg-green-500',
  todo: 'bg-gray-400',
  review: 'bg-purple-500',
  done: 'bg-green-500'
}

export default function GanttChart({ phases, tasks = [], teamMembers = [], showTasks = false }: GanttChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('phases')
  const [timeScale, setTimeScale] = useState<'weeks' | 'months'>('weeks')
  const [isExpanded, setIsExpanded] = useState(true)

  const ganttData = useMemo(() => {
    const startDate = new Date()
    const totalWeeks = phases.reduce((acc, phase) => {
      const weeks = parseInt(phase.duration.split('-')[0]) || 8
      return acc + weeks
    }, 0)

    const timelineData: GanttItem[] = []
    let currentOffset = 0

    phases.forEach((phase, phaseIndex) => {
      const duration = parseInt(phase.duration.split('-')[0]) || 8
      const phaseStart = currentOffset
      const phaseEnd = currentOffset + duration

      const phaseDependencies = phase.dependencies || []
      const dependencyOffsets = phaseDependencies
        .map(depName => {
          const depIndex = phases.findIndex(p => p.name.toLowerCase().includes(depName.toLowerCase()))
          if (depIndex >= 0) {
            let offset = 0
            for (let i = 0; i < depIndex; i++) {
              offset += parseInt(phases[i].duration.split('-')[0]) || 8
            }
            return offset + (parseInt(phases[depIndex].duration.split('-')[0]) || 8)
          }
          return 0
        })
        .filter(offset => offset > 0)

      const actualStart = Math.max(phaseStart, ...dependencyOffsets)
      const actualEnd = actualStart + duration

      timelineData.push({
        type: 'phase' as const,
        id: phase.id,
        name: phase.name,
        phase: phase.phase,
        priority: phase.priority,
        start: actualStart,
        end: actualEnd,
        duration,
        status: calculatePhaseStatus(phase.tasks),
        dependencies: phaseDependencies,
        tasks: phase.tasks || [],
        outcomes: phase.outcomes || []
      })

      if (viewMode === 'combined' || viewMode === 'tasks') {
        const phaseTasks = phase.tasks || []
        const taskDuration = duration / Math.max(phaseTasks.length, 1)
        
        phaseTasks.forEach((task, taskIndex) => {
          const taskStart = actualStart + (taskIndex * taskDuration)
          const taskEnd = taskStart + taskDuration

          const taskDeps = (task as any).dependencies || []
          
          timelineData.push({
            type: 'task' as const,
            id: task.id,
            name: task.name,
            phaseId: phase.id,
            phaseName: phase.name,
            priority: phase.priority,
            start: taskStart,
            end: taskEnd,
            duration: taskDuration,
            status: task.status,
            effort: task.effort,
            owner: task.owner,
            dependencies: taskDeps
          })
        })
      }

      currentOffset += duration
    })

    if (viewMode === 'tasks' && tasks.length > 0) {
      const tasksByPhase = new Map<string, Task[]>()
      tasks.forEach(task => {
        if (task.contextId) {
          const existing = tasksByPhase.get(task.contextId) || []
          existing.push(task)
          tasksByPhase.set(task.contextId, existing)
        }
      })

      tasksByPhase.forEach((phaseTasks, phaseId) => {
        const phase = phases.find(p => p.id === phaseId)
        if (!phase) return

        const phaseData = timelineData.find(d => d.id === phaseId && d.type === 'phase')
        if (!phaseData) return

        const taskDuration = phaseData.duration / Math.max(phaseTasks.length, 1)
        
        phaseTasks.forEach((task, index) => {
          const taskStart = phaseData.start + (index * taskDuration)
          const taskEnd = taskStart + taskDuration

          timelineData.push({
            type: 'task' as const,
            id: task.id,
            name: task.title,
            phaseId: phase.id,
            phaseName: phase.name,
            priority: task.priority as any,
            start: taskStart,
            end: taskEnd,
            duration: taskDuration,
            status: task.status,
            assigneeId: task.assigneeId,
            dependencies: []
          })
        })
      })
    }

    return {
      items: timelineData,
      totalWeeks,
      startDate
    }
  }, [phases, tasks, viewMode])

  const calculatePhaseStatus = (tasks: RoadmapTask[]): 'pending' | 'in-progress' | 'completed' => {
    if (!tasks || tasks.length === 0) return 'pending'
    const completed = tasks.filter(t => t.status === 'completed').length
    const inProgress = tasks.filter(t => t.status === 'in-progress').length
    
    if (completed === tasks.length) return 'completed'
    if (inProgress > 0 || completed > 0) return 'in-progress'
    return 'pending'
  }

  const timelineWeeks = useMemo(() => {
    const weeks: number[] = []
    for (let i = 0; i < ganttData.totalWeeks; i++) {
      weeks.push(i)
    }
    return weeks
  }, [ganttData.totalWeeks])

  const weekWidth = isExpanded ? 80 : 40
  const rowHeight = 56

  const filteredItems = useMemo(() => {
    if (viewMode === 'phases') {
      return ganttData.items.filter(item => item.type === 'phase')
    }
    if (viewMode === 'tasks') {
      return ganttData.items.filter(item => item.type === 'task')
    }
    return ganttData.items
  }, [ganttData.items, viewMode])

  const groupedItems = useMemo(() => {
    if (viewMode !== 'combined') return null

    const groups: { phase: any; tasks: any[] }[] = []
    const phaseItems = ganttData.items.filter(item => item.type === 'phase')
    
    phaseItems.forEach(phase => {
      const phaseTasks = ganttData.items.filter(item => item.type === 'task' && item.phaseId === phase.id)
      groups.push({ phase, tasks: phaseTasks })
    })

    return groups
  }, [ganttData.items, viewMode])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarBlank size={24} weight="duotone" className="text-accent" />
              Gantt Chart Timeline
            </CardTitle>
            <CardDescription>
              Visual timeline with dependencies and milestones across {ganttData.totalWeeks} weeks
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={viewMode} onValueChange={(val) => setViewMode(val as ViewMode)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phases">Phases Only</SelectItem>
                <SelectItem value="tasks">Tasks Only</SelectItem>
                <SelectItem value="combined">Combined View</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ArrowsInLineHorizontal size={18} /> : <ArrowsOutLineHorizontal size={18} />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="min-w-max">
            <div className="flex border-b">
              <div className="w-64 flex-shrink-0 p-3 border-r bg-muted/30 font-semibold text-sm">
                {viewMode === 'phases' ? 'Phase / Milestone' : viewMode === 'tasks' ? 'Task' : 'Phase / Task'}
              </div>
              <div className="flex">
                {timelineWeeks.map(week => (
                  <div 
                    key={week} 
                    className="border-r text-center p-2 text-xs text-muted-foreground" 
                    style={{ width: weekWidth }}
                  >
                    W{week + 1}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              {viewMode === 'combined' && groupedItems ? (
                <>
                  {groupedItems.map((group, groupIndex) => (
                    <div key={group.phase.id}>
                      <GanttRow
                        item={group.phase}
                        weekWidth={weekWidth}
                        rowHeight={rowHeight}
                        totalWeeks={ganttData.totalWeeks}
                        teamMembers={teamMembers}
                        allItems={ganttData.items}
                      />
                      {group.tasks.map((task, taskIndex) => (
                        <GanttRow
                          key={task.id}
                          item={task}
                          weekWidth={weekWidth}
                          rowHeight={rowHeight}
                          totalWeeks={ganttData.totalWeeks}
                          teamMembers={teamMembers}
                          allItems={ganttData.items}
                          isSubItem
                        />
                      ))}
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {filteredItems.map((item, index) => (
                    <GanttRow
                      key={item.id}
                      item={item}
                      weekWidth={weekWidth}
                      rowHeight={rowHeight}
                      totalWeeks={ganttData.totalWeeks}
                      teamMembers={teamMembers}
                      allItems={ganttData.items}
                    />
                  ))}
                </>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-4 p-4 bg-muted/20 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="h-3 w-6 rounded bg-green-500" />
                <span className="text-xs text-muted-foreground">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-6 rounded bg-blue-500" />
                <span className="text-xs text-muted-foreground">In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-6 rounded bg-gray-400" />
                <span className="text-xs text-muted-foreground">Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight size={16} weight="bold" className="text-accent" />
                <span className="text-xs text-muted-foreground">Dependency Link</span>
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

interface GanttRowProps {
  item: any
  weekWidth: number
  rowHeight: number
  totalWeeks: number
  teamMembers: TeamMember[]
  allItems: any[]
  isSubItem?: boolean
}

function GanttRow({ item, weekWidth, rowHeight, totalWeeks, teamMembers, allItems, isSubItem = false }: GanttRowProps) {
  const barLeft = (item.start / totalWeeks) * (weekWidth * totalWeeks)
  const barWidth = ((item.end - item.start) / totalWeeks) * (weekWidth * totalWeeks)
  
  const statusColor = statusColors[item.status as keyof typeof statusColors] || 'bg-gray-400'
  const assignee = item.assigneeId ? teamMembers.find(m => m.id === item.assigneeId) : null

  const StatusIcon = item.status === 'completed' || item.status === 'done' 
    ? CheckCircle 
    : item.status === 'in-progress' 
    ? Clock 
    : Warning

  const dependencies = item.dependencies || []
  const dependencyLines = dependencies.map((depId: string) => {
    const depItem = allItems.find(i => i.id === depId || i.name.toLowerCase().includes(depId.toLowerCase()))
    if (!depItem) return null

    const depEndX = (depItem.end / totalWeeks) * (weekWidth * totalWeeks)
    const currentStartX = barLeft
    
    return {
      from: depEndX,
      to: currentStartX,
      depItem
    }
  }).filter(Boolean)

  return (
    <div className="flex border-b relative" style={{ height: rowHeight }}>
      <div className={cn(
        "w-64 flex-shrink-0 p-3 border-r bg-card flex items-center gap-2",
        isSubItem && "pl-8 bg-muted/10"
      )}>
        <StatusIcon size={16} weight="fill" className={cn(
          item.status === 'completed' || item.status === 'done' ? 'text-green-600' :
          item.status === 'in-progress' ? 'text-blue-600' : 'text-gray-400'
        )} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {item.type === 'phase' && (
              <Badge variant="outline" className="text-xs">
                Phase {item.phase}
              </Badge>
            )}
            {item.effort && (
              <span className="text-xs text-muted-foreground font-mono">{item.effort}</span>
            )}
            {assignee && (
              <span className="text-xs text-muted-foreground">{assignee.name.split(' ')[0]}</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex-1 relative">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-all",
                  statusColor,
                  item.type === 'phase' ? "h-8" : "h-6"
                )}
                style={{
                  left: barLeft,
                  width: Math.max(barWidth, 20),
                }}
              >
                <div className="h-full flex items-center justify-between px-2 text-white text-xs font-medium">
                  <span className="truncate">{item.name}</span>
                  {item.priority && (
                    <div className={cn(
                      "h-2 w-2 rounded-full ml-2 flex-shrink-0",
                      priorityColors[item.priority as keyof typeof priorityColors]
                    )} />
                  )}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="space-y-1">
                <p className="font-semibold">{item.name}</p>
                {item.phaseName && (
                  <p className="text-xs text-muted-foreground">Phase: {item.phaseName}</p>
                )}
                <p className="text-xs">Duration: {item.duration?.toFixed(1)} weeks</p>
                <p className="text-xs">Status: <span className="capitalize">{item.status}</span></p>
                {item.effort && <p className="text-xs">Effort: {item.effort}</p>}
                {item.owner && <p className="text-xs">Owner: {item.owner}</p>}
                {assignee && <p className="text-xs">Assignee: {assignee.name}</p>}
                {dependencies.length > 0 && (
                  <p className="text-xs text-orange-400">
                    ⚠️ {dependencies.length} {dependencies.length === 1 ? 'dependency' : 'dependencies'}
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {dependencyLines.map((dep: any, index: number) => {
          if (!dep) return null
          
          const midX = (dep.from + dep.to) / 2
          const arrowSize = 6
          
          return (
            <TooltipProvider key={index}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <svg
                    className="absolute top-0 left-0 pointer-events-none"
                    width={weekWidth * totalWeeks}
                    height={rowHeight}
                    style={{ overflow: 'visible' }}
                  >
                    <defs>
                      <marker
                        id={`arrowhead-${item.id}-${index}`}
                        markerWidth="10"
                        markerHeight="10"
                        refX="8"
                        refY="3"
                        orient="auto"
                      >
                        <polygon
                          points="0 0, 10 3, 0 6"
                          fill="oklch(0.70 0.15 200)"
                        />
                      </marker>
                    </defs>
                    <path
                      d={`M ${dep.from} ${rowHeight / 2} L ${midX} ${rowHeight / 2} L ${midX} ${rowHeight / 2} L ${dep.to - arrowSize} ${rowHeight / 2}`}
                      stroke="oklch(0.70 0.15 200)"
                      strokeWidth="2"
                      fill="none"
                      markerEnd={`url(#arrowhead-${item.id}-${index})`}
                      opacity="0.6"
                    />
                  </svg>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Depends on: {dep.depItem.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        })}
      </div>
    </div>
  )
}

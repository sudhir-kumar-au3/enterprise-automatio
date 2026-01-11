import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { roadmap } from '@/lib/architecture-data'
import { Calendar, Lightning, TrendUp, CheckCircle, Circle, Clock, Export, GoogleLogo, ChartLine, ListBullets } from '@phosphor-icons/react'
import { exportTasksToICal } from '@/lib/ical-export'
import { Task } from '@/lib/collaboration-data'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import GanttChart from '@/components/GanttChart'
import { useState } from 'react'

const priorityColors = {
  critical: 'bg-red-500/10 text-red-700 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
  medium: 'bg-blue-500/10 text-blue-700 border-blue-500/20'
}

const statusIcons = {
  completed: CheckCircle,
  'in-progress': Clock,
  pending: Circle
}

const statusColors = {
  completed: 'text-green-600',
  'in-progress': 'text-yellow-600',
  pending: 'text-muted-foreground'
}

const RoadmapView = () => {
  const [viewMode, setViewMode] = useState<'list' | 'gantt'>('list')

  const calculateProgress = (tasks: typeof roadmap[0]['tasks']) => {
    if (!tasks || tasks.length === 0) return 0
    const completed = tasks.filter(t => t.status === 'completed').length
    return Math.round((completed / tasks.length) * 100)
  }

  const convertRoadmapToTasks = (): Task[] => {
    const now = Date.now()
    const tasksPerPhase: Task[] = []
    
    roadmap.forEach((phase, phaseIndex) => {
      const phaseStartOffset = phaseIndex * 90 * 24 * 60 * 60 * 1000
      
      phase.tasks.forEach((task, taskIndex) => {
        const taskOffset = Math.floor((taskIndex / phase.tasks.length) * 90) * 24 * 60 * 60 * 1000
        const dueDate = now + phaseStartOffset + taskOffset
        
        tasksPerPhase.push({
          id: task.id,
          title: `${phase.name}: ${task.name}`,
          description: `Phase ${phase.phase} task - ${phase.duration}`,
          status: task.status === 'completed' ? 'done' : 
                  task.status === 'in-progress' ? 'in-progress' : 'todo',
          priority: phase.priority === 'critical' ? 'critical' : 
                    phase.priority === 'high' ? 'high' : 'medium',
          creatorId: 'system',
          contextType: 'roadmap',
          contextId: phase.id,
          dueDate: dueDate,
          createdAt: now,
          updatedAt: now,
          tags: [phase.name, `Phase ${phase.phase}`],
          comments: []
        })
      })
    })
    
    return tasksPerPhase
  }

  const handleExportRoadmap = () => {
    const tasks = convertRoadmapToTasks()
    exportTasksToICal(tasks, 'Implementation Roadmap')
    toast.success(`Exported ${tasks.length} roadmap tasks to iCal format`)
  }

  const handleExportPhase = (phase: typeof roadmap[0]) => {
    const allTasks = convertRoadmapToTasks()
    const phaseTasks = allTasks.filter(t => t.contextId === phase.id)
    exportTasksToICal(phaseTasks, `Phase ${phase.phase}: ${phase.name}`)
    toast.success(`Exported ${phaseTasks.length} tasks from Phase ${phase.phase}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold mb-2">Implementation Roadmap</h2>
          <p className="text-muted-foreground text-lg">
            Phased rollout plan with timelines, dependencies, and progress tracking
          </p>
        </div>

        <div className="flex gap-2">
          <Tabs value={viewMode} onValueChange={(val) => setViewMode(val as 'list' | 'gantt')}>
            <TabsList>
              <TabsTrigger value="list" className="gap-2">
                <ListBullets size={18} />
                List View
              </TabsTrigger>
              <TabsTrigger value="gantt" className="gap-2">
                <ChartLine size={18} />
                Gantt Chart
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Export size={18} />
                Export Roadmap
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Export to iCal</DropdownMenuLabel>
              <DropdownMenuItem onClick={handleExportRoadmap}>
                <Calendar size={16} className="mr-2" />
                Complete Roadmap
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Export by Phase</DropdownMenuLabel>
              {roadmap.map(phase => (
                <DropdownMenuItem key={phase.id} onClick={() => handleExportPhase(phase)}>
                  <Calendar size={16} className="mr-2" />
                  Phase {phase.phase}: {phase.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {viewMode === 'gantt' ? (
        <GanttChart phases={roadmap} />
      ) : (
        <>
          <div className="grid md:grid-cols-3 gap-4">
        {roadmap.map(phase => {
          const progress = calculateProgress(phase.tasks)
          return (
            <Card key={phase.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-xs">
                    Phase {phase.phase}
                  </Badge>
                  <Badge variant="outline" className={`${priorityColors[phase.priority]} text-xs`}>
                    {phase.priority}
                  </Badge>
                </div>
                <CardTitle className="text-xl">{phase.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-2">
                  <Calendar size={16} />
                  {phase.duration}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {(phase.tasks || []).filter(t => t.status === 'completed').length} of {(phase.tasks || []).length} tasks completed
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightning size={24} weight="duotone" className="text-accent" />
            Detailed Phase Breakdown
          </CardTitle>
          <CardDescription>
            Tasks, dependencies, and expected outcomes for each implementation phase
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full" defaultValue={roadmap[0].id}>
            {roadmap.map(phase => {
              const progress = calculateProgress(phase.tasks)
              return (
                <AccordionItem key={phase.id} value={phase.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                          {phase.phase}
                        </div>
                        <div className="text-left">
                          <h4 className="font-semibold text-base">{phase.name}</h4>
                          <p className="text-sm text-muted-foreground">{phase.duration}</p>
                        </div>
                      </div>
                      <div className="ml-auto mr-4 flex items-center gap-3">
                        <Badge variant="outline" className={priorityColors[phase.priority]}>
                          {phase.priority}
                        </Badge>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{progress}%</p>
                          <p className="text-xs text-muted-foreground">complete</p>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-6 pt-4 pl-12">
                      <div className="flex justify-end">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2"
                          onClick={() => handleExportPhase(phase)}
                        >
                          <Export size={16} />
                          Export Phase
                        </Button>
                      </div>

                      {(phase.dependencies || []).length > 0 && (
                        <div>
                          <h5 className="text-sm font-semibold mb-2">Dependencies</h5>
                          <div className="flex flex-wrap gap-2">
                            {(phase.dependencies || []).map(dep => (
                              <Badge key={dep} variant="outline" className="text-xs">
                                {dep}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <h5 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <TrendUp size={16} />
                          Tasks ({(phase.tasks || []).length})
                        </h5>
                        <div className="space-y-2">
                          {(phase.tasks || []).map(task => {
                            const StatusIcon = statusIcons[task.status]
                            return (
                              <div 
                                key={task.id} 
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <StatusIcon 
                                    size={20} 
                                    weight="fill" 
                                    className={statusColors[task.status]} 
                                  />
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{task.name}</p>
                                    {task.owner && (
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        Owner: {task.owner}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Badge variant="secondary" className="text-xs font-mono">
                                    {task.effort}
                                  </Badge>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                      task.status === 'completed' ? 'border-green-500/50 text-green-700' :
                                      task.status === 'in-progress' ? 'border-yellow-500/50 text-yellow-700' :
                                      'border-muted'
                                    }`}
                                  >
                                    {task.status}
                                  </Badge>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <div>
                        <h5 className="text-sm font-semibold mb-2">Expected Outcomes</h5>
                        <ul className="space-y-1">
                          {(phase.outcomes || []).map((outcome, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                              <CheckCircle size={16} weight="fill" className="text-green-600 shrink-0 mt-0.5" />
                              <span>{outcome}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  )
}

export default RoadmapView

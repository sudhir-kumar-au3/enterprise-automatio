import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Task, TeamMember } from '@/lib/collaboration-data'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowRight, Warning, CheckCircle, FlagBanner } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface TaskDependenciesDialogProps {
  task: Task
  allTasks: Task[]
  teamMembers: TeamMember[]
  onUpdate: (taskId: string, dependencies: string[]) => void
  onClose: () => void
}

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

export default function TaskDependenciesDialog({
  task,
  allTasks,
  teamMembers,
  onUpdate,
  onClose
}: TaskDependenciesDialogProps) {
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>(task.dependencies || [])

  const availableTasks = allTasks.filter(t => t.id !== task.id)

  const toggleDependency = (taskId: string) => {
    setSelectedDependencies(current => {
      if (current.includes(taskId)) {
        return current.filter(id => id !== taskId)
      }
      
      if (wouldCreateCycle(taskId)) {
        toast.error('Cannot add dependency: would create a circular dependency')
        return current
      }
      
      return [...current, taskId]
    })
  }

  const wouldCreateCycle = (newDepId: string): boolean => {
    const visited = new Set<string>()
    const stack = [newDepId]

    while (stack.length > 0) {
      const currentId = stack.pop()!
      
      if (currentId === task.id) {
        return true
      }

      if (visited.has(currentId)) {
        continue
      }

      visited.add(currentId)

      const currentTask = allTasks.find(t => t.id === currentId)
      if (currentTask && currentTask.dependencies) {
        stack.push(...currentTask.dependencies)
      }
    }

    return false
  }

  const handleSave = () => {
    onUpdate(task.id, selectedDependencies)
    toast.success(`Updated dependencies for "${task.title}"`)
    onClose()
  }

  const currentDependencies = selectedDependencies
    .map(depId => allTasks.find(t => t.id === depId))
    .filter(Boolean) as Task[]

  const dependentTasks = allTasks.filter(t => 
    (t.dependencies || []).includes(task.id)
  )

  const isBlocked = currentDependencies.some(dep => dep.status !== 'done')

  return (
    <DialogContent className="max-w-3xl max-h-[80vh]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <ArrowRight size={24} weight="duotone" className="text-accent" />
          Task Dependencies
        </DialogTitle>
        <DialogDescription>
          Manage dependencies for: <span className="font-semibold">{task.title}</span>
        </DialogDescription>
      </DialogHeader>

      <ScrollArea className="max-h-[50vh]">
        <div className="space-y-6 pr-4">
          {isBlocked && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
              <Warning size={20} weight="fill" className="text-orange-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-orange-900">Task Blocked</p>
                <p className="text-xs text-orange-700 mt-0.5">
                  This task depends on {currentDependencies.filter(d => d.status !== 'done').length} incomplete task(s)
                </p>
              </div>
            </div>
          )}

          {currentDependencies.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Current Dependencies ({currentDependencies.length})</h4>
              <div className="space-y-2">
                {currentDependencies.map(dep => {
                  const assignee = dep.assigneeId ? teamMembers.find(m => m.id === dep.assigneeId) : null
                  return (
                    <div key={dep.id} className="p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{dep.title}</p>
                            <FlagBanner size={14} weight="fill" className={priorityColors[dep.priority]} />
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn('text-xs', statusColors[dep.status])}>
                              {dep.status}
                            </Badge>
                            {assignee && (
                              <div className="flex items-center gap-1">
                                <Avatar className="h-4 w-4">
                                  <AvatarImage src={assignee.avatarUrl} alt={assignee.name} />
                                  <AvatarFallback className="text-xs">
                                    {assignee.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-muted-foreground">{assignee.name.split(' ')[0]}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {dep.status === 'done' ? (
                          <CheckCircle size={20} weight="fill" className="text-green-600" />
                        ) : (
                          <Warning size={20} weight="fill" className="text-orange-600" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {dependentTasks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Blocks These Tasks ({dependentTasks.length})</h4>
              <p className="text-xs text-muted-foreground">
                The following tasks depend on this one completing
              </p>
              <div className="space-y-2">
                {dependentTasks.map(dep => {
                  const assignee = dep.assigneeId ? teamMembers.find(m => m.id === dep.assigneeId) : null
                  return (
                    <div key={dep.id} className="p-2 border rounded-lg bg-muted/30 text-sm">
                      <div className="flex items-center justify-between">
                        <span>{dep.title}</span>
                        {assignee && (
                          <div className="flex items-center gap-1">
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={assignee.avatarUrl} alt={assignee.name} />
                              <AvatarFallback className="text-xs">
                                {assignee.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">{assignee.name.split(' ')[0]}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Add Dependencies</h4>
            <p className="text-xs text-muted-foreground">
              Select tasks that must be completed before this one can start
            </p>
            <div className="space-y-2">
              {availableTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No other tasks available
                </p>
              ) : (
                availableTasks.map(availableTask => {
                  const assignee = availableTask.assigneeId ? teamMembers.find(m => m.id === availableTask.assigneeId) : null
                  const isSelected = selectedDependencies.includes(availableTask.id)
                  
                  return (
                    <div 
                      key={availableTask.id}
                      className={cn(
                        "p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                        isSelected && "border-accent bg-accent/5"
                      )}
                      onClick={() => toggleDependency(availableTask.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleDependency(availableTask.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{availableTask.title}</p>
                            <FlagBanner size={14} weight="fill" className={priorityColors[availableTask.priority]} />
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn('text-xs', statusColors[availableTask.status])}>
                              {availableTask.status}
                            </Badge>
                            {assignee && (
                              <div className="flex items-center gap-1">
                                <Avatar className="h-4 w-4">
                                  <AvatarImage src={assignee.avatarUrl} alt={assignee.name} />
                                  <AvatarFallback className="text-xs">
                                    {assignee.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-muted-foreground">{assignee.name.split(' ')[0]}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Save Dependencies
        </Button>
      </div>
    </DialogContent>
  )
}

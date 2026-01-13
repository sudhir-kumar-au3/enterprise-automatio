import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Users, 
  Plus, 
  CheckCircle,
  Clock,
  Tag,
  CalendarBlank,
  FlagBanner,
  Sparkle,
  ArrowCounterClockwise
} from '@phosphor-icons/react'
import { Task, TeamMember } from '@/lib/collaboration-data'
import { services } from '@/lib/architecture-data'
import { taskTemplates, getAutoAssignedMember } from '@/lib/task-templates'
import { toast } from 'sonner'

export interface CreateTaskDialogProps {
  onClose: () => void
  onCreate: (task: Task) => void
  currentUser: TeamMember
  teamMembers: TeamMember[]
}

const CreateTaskDialog = ({ onClose, onCreate, currentUser, teamMembers }: CreateTaskDialogProps) => {
  const [showTemplates, setShowTemplates] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Task['priority']>('medium')
  const [assignee, setAssignee] = useState<string>('unassigned')
  const [contextType, setContextType] = useState<'service' | 'workflow' | 'general'>('general')
  const [contextId, setContextId] = useState<string>('general')
  const [dueDate, setDueDate] = useState<string>('')
  const [tags, setTags] = useState<string>('')
  const [templateCategory, setTemplateCategory] = useState('all')

  const handleCreate = () => {
    if (!title.trim()) {
      toast.error('Please enter a task title')
      return
    }

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title,
      description,
      status: 'todo',
      priority,
      assigneeId: assignee === 'unassigned' ? undefined : assignee,
      creatorId: currentUser.id,
      contextType,
      contextId: contextId === 'general' ? undefined : contextId,
      dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      comments: []
    }

    onCreate(newTask)
  }

  const handleTemplateSelect = (templateId: string) => {
    const template = taskTemplates.find(t => t.id === templateId)
    if (!template) return

    setSelectedTemplate(templateId)
    setTitle(template.defaultTitle)
    setDescription(template.defaultDescription)
    setPriority(template.defaultPriority)
    setTags(template.defaultTags.join(', '))
    if (template.suggestedDueDays) {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + template.suggestedDueDays)
      setDueDate(dueDate.toISOString().split('T')[0])
    }

    const autoAssignedMember = getAutoAssignedMember(template, teamMembers)
    if (autoAssignedMember) {
      setAssignee(autoAssignedMember.id)
      toast.success(`Applied "${template.name}" template - Auto-assigned to ${autoAssignedMember.name}`)
    } else {
      toast.success(`Applied "${template.name}" template`)
    }
    
    setShowTemplates(false)
  }

  const handleStartFromScratch = () => {
    setShowTemplates(false)
  }

  const handleResetTemplate = () => {
    setShowTemplates(true)
    setSelectedTemplate(null)
    setTitle('')
    setDescription('')
    setPriority('medium')
    setTags('')
    setDueDate('')
  }

  const filteredTemplates = taskTemplates.filter(t => 
    templateCategory === 'all' || t.category === templateCategory
  )

  const selectedAssignee = teamMembers.find(m => m.id === assignee)

  const priorityIcons = {
    low: <FlagBanner size={16} weight="fill" className="text-blue-500" />,
    medium: <FlagBanner size={16} weight="fill" className="text-yellow-500" />,
    high: <FlagBanner size={16} weight="fill" className="text-orange-500" />,
    critical: <FlagBanner size={16} weight="fill" className="text-red-500" />
  }

  return (
    <>
      <DialogHeader className="space-y-2 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <DialogTitle className="text-xl">Create New Task</DialogTitle>
            <DialogDescription className="text-sm mt-1">
              {showTemplates ? 'Choose a template or start from scratch' : 'Add details and assign work to your team'}
            </DialogDescription>
          </div>
          {!showTemplates && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetTemplate}
              className="gap-2 text-muted-foreground"
            >
              <ArrowCounterClockwise size={14} />
              Templates
            </Button>
          )}
        </div>
      </DialogHeader>

      {showTemplates ? (
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-4 mt-2">
            <div className="flex gap-2 flex-wrap">
              {['all', 'development', 'operations', 'design', 'documentation'].map(cat => (
                <Button
                  key={cat}
                  variant={templateCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTemplateCategory(cat)}
                  className="capitalize"
                >
                  {cat === 'all' ? 'All' : cat}
                </Button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {filteredTemplates.map(template => {
                const Icon = template.icon
                const autoAssignedMember = template.autoAssignRoles ? getAutoAssignedMember(template, teamMembers) : undefined
                return (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:border-primary transition-all"
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-muted rounded-md">
                          <Icon size={20} weight="regular" className="text-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm mb-1">{template.name}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {template.description}
                          </p>
                          {autoAssignedMember && (
                            <div className="flex items-center gap-1.5 mb-2 text-xs text-primary">
                              <Users size={12} weight="bold" />
                              <span>Auto-assigns to {autoAssignedMember.name}</span>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1">
                            {template.defaultTags.slice(0, 2).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <Separator />

            <Button
              variant="outline"
              className="w-full h-12 gap-2"
              onClick={handleStartFromScratch}
            >
              <Plus size={18} weight="bold" />
              Start from Scratch
            </Button>
          </div>
        </ScrollArea>
      ) : (
        <>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-5 mt-2">
              {selectedTemplate && (
                <div className="bg-muted border rounded-md p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkle size={14} weight="fill" className="text-foreground" />
                    <span className="text-sm font-medium">
                      Using "{taskTemplates.find(t => t.id === selectedTemplate)?.name}" template
                    </span>
                  </div>
                  {assignee !== 'unassigned' && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users size={10} weight="bold" />
                      <span>Auto-assigned based on role matching</span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm">Task Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Implement user authentication"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-10"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Add details, requirements, or context..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="resize-none text-sm"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority" className="text-sm flex items-center gap-2">
                    <FlagBanner size={12} weight="regular" />
                    Priority
                  </Label>
                  <Select value={priority} onValueChange={(val) => setPriority(val as Task['priority'])}>
                    <SelectTrigger id="priority" className="h-10">
                      <div className="flex items-center gap-2">
                        {priorityIcons[priority]}
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">
                        <div className="flex items-center gap-2">
                          <FlagBanner size={14} weight="fill" className="text-blue-500" />
                          <span>Low Priority</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="medium">
                        <div className="flex items-center gap-2">
                          <FlagBanner size={14} weight="fill" className="text-yellow-500" />
                          <span>Medium Priority</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="high">
                        <div className="flex items-center gap-2">
                          <FlagBanner size={14} weight="fill" className="text-orange-500" />
                          <span>High Priority</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="critical">
                        <div className="flex items-center gap-2">
                          <FlagBanner size={14} weight="fill" className="text-red-500" />
                          <span>Critical Priority</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignee" className="text-sm flex items-center gap-2">
                    <Users size={12} weight="regular" />
                    Assign To
                  </Label>
                  <Select value={assignee} onValueChange={setAssignee}>
                    <SelectTrigger id="assignee" className="h-10">
                      <div className="flex items-center gap-2">
                        {selectedAssignee ? (
                          <>
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={selectedAssignee.avatarUrl} alt={selectedAssignee.name} />
                              <AvatarFallback className="text-xs">
                                {selectedAssignee.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span>{selectedAssignee.name}</span>
                          </>
                        ) : (
                          <SelectValue placeholder="Unassigned" />
                        )}
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                            <Users size={12} className="text-muted-foreground" />
                          </div>
                          <span>Unassigned</span>
                        </div>
                      </SelectItem>
                      {teamMembers.map(member => (
                        <SelectItem key={member.id} value={member.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={member.avatarUrl} alt={member.name} />
                              <AvatarFallback className="text-xs">
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span>{member.name}</span>
                            <Badge variant="outline" className="text-xs ml-auto">{member.role}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="due-date" className="text-sm flex items-center gap-2">
                  <CalendarBlank size={12} weight="regular" />
                  Due Date
                </Label>
                <Input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="h-10"
                />
                {dueDate && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock size={10} />
                    Due {new Date(dueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags" className="text-sm flex items-center gap-2">
                  <Tag size={12} weight="regular" />
                  Tags
                </Label>
                <Input
                  id="tags"
                  placeholder="e.g., backend, urgent, bug-fix (comma separated)"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="h-10"
                />
                {tags && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {tags.split(',').map(t => t.trim()).filter(Boolean).map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="context" className="text-sm">Related To</Label>
                <Select value={contextId} onValueChange={setContextId}>
                  <SelectTrigger id="context" className="h-10">
                    <SelectValue placeholder="General task" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Task</SelectItem>
                    {(services || []).map(service => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </ScrollArea>

          <div className="flex gap-3 justify-end pt-6 border-t mt-6">
            <Button variant="outline" onClick={onClose} className="h-10 px-5">
              Cancel
            </Button>
            <Button onClick={handleCreate} className="h-10 px-5 gap-2">
              <CheckCircle size={16} weight="bold" />
              Create Task
            </Button>
          </div>
        </>
      )}
    </>
  )
}

export default CreateTaskDialog

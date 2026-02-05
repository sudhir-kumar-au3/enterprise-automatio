import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  CalendarBlank, 
  Clock, 
  Users, 
  VideoCamera,
  GoogleLogo,
  MicrosoftTeamsLogo,
  Export,
  ArrowRight,
  Check,
  X,
  Plus,
  FloppyDisk
} from '@phosphor-icons/react'
import { TeamMember } from '@/lib/collaboration-data'
import { 
  MeetingType,
  MeetingPlatform,
  meetingTemplates,
  openMeetingScheduler,
  getDefaultMeetingTimes,
  downloadICSFile,
  MeetingDetails
} from '@/lib/meeting-scheduler'
import { CreateMeetingData } from '@/api/services/meetings'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CreateMeetingDialogProps {
  isOpen: boolean
  onClose: () => void
  teamMembers: TeamMember[]
  preselectedMembers?: TeamMember[]
  defaultTitle?: string
  onMeetingCreated?: (meeting: any) => void
  createMeeting?: (data: CreateMeetingData) => Promise<any>
}

export function CreateMeetingDialog({ 
  isOpen, 
  onClose, 
  teamMembers,
  preselectedMembers = [],
  defaultTitle = '',
  onMeetingCreated,
  createMeeting
}: CreateMeetingDialogProps) {
  const [step, setStep] = useState<'template' | 'details' | 'schedule'>('template')
  const [selectedTemplate, setSelectedTemplate] = useState<MeetingType | null>(null)
  const [title, setTitle] = useState(defaultTitle)
  const [description, setDescription] = useState('')
  const [selectedDate, setSelectedDate] = useState(() => {
    const { start } = getDefaultMeetingTimes()
    return start.toISOString().split('T')[0]
  })
  const [startTime, setStartTime] = useState(() => {
    const { start } = getDefaultMeetingTimes()
    return start.toTimeString().slice(0, 5)
  })
  const [duration, setDuration] = useState(30)
  const [selectedAttendees, setSelectedAttendees] = useState<TeamMember[]>(preselectedMembers)
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrencePattern, setRecurrencePattern] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly'>('weekly')
  const [location, setLocation] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [platform, setPlatform] = useState<'google' | 'teams' | 'zoom' | 'other' | undefined>(undefined)

  const handleTemplateSelect = (templateId: MeetingType) => {
    const template = meetingTemplates.find(t => t.id === templateId)
    if (template) {
      setSelectedTemplate(templateId)
      setTitle(template.title)
      setDescription(template.description)
      setDuration(template.defaultDuration)
      
      // Auto-select attendees based on template
      if (template.suggestedAttendees === 'all') {
        setSelectedAttendees(teamMembers)
      } else if (template.suggestedAttendees === 'developers') {
        setSelectedAttendees(teamMembers.filter(m => m.role === 'developer'))
      } else if (template.suggestedAttendees === 'leads') {
        setSelectedAttendees(teamMembers.filter(m => m.accessLevel === 'owner' || m.accessLevel === 'admin'))
      }
      
      setStep('details')
    }
  }

  const handleToggleAttendee = (member: TeamMember) => {
    setSelectedAttendees(current => {
      const isSelected = current.some(m => m.id === member.id)
      if (isSelected) {
        return current.filter(m => m.id !== member.id)
      }
      return [...current, member]
    })
  }

  const handleSelectAll = () => {
    setSelectedAttendees(teamMembers)
  }

  const handleDeselectAll = () => {
    setSelectedAttendees([])
  }

  const getMeetingDetails = (): MeetingDetails => {
    const startDateTime = new Date(`${selectedDate}T${startTime}`)
    const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000)
    
    return {
      title,
      description,
      startDate: startDateTime,
      endDate: endDateTime,
      attendees: selectedAttendees,
      meetingType: selectedTemplate || 'custom',
      location,
      isRecurring,
      recurrencePattern: isRecurring ? recurrencePattern : undefined
    }
  }

  const getCreateMeetingData = (): CreateMeetingData => {
    const startDateTime = new Date(`${selectedDate}T${startTime}`)
    const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000)
    
    return {
      title,
      description,
      meetingType: selectedTemplate || 'custom',
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      duration,
      location: location || undefined,
      platform,
      attendeeIds: selectedAttendees.map(a => a.id),
      isRecurring,
      recurrencePattern: isRecurring ? recurrencePattern : 'none',
      reminderMinutes: [15],
    }
  }

  // Save meeting to database and optionally open external calendar
  const handleSaveMeeting = async (openExternal?: MeetingPlatform) => {
    if (!title.trim()) {
      toast.error('Please enter a meeting title')
      return
    }
    if (selectedAttendees.length === 0) {
      toast.error('Please select at least one attendee')
      return
    }

    setIsSaving(true)
    try {
      // Save to database if createMeeting function is provided
      if (createMeeting) {
        const data = getCreateMeetingData()
        if (openExternal) {
          data.platform = openExternal === 'outlook' ? 'other' : openExternal
        }
        const meeting = await createMeeting(data)
        onMeetingCreated?.(meeting)
      }

      // Open external calendar if requested
      if (openExternal) {
        const meetingDetails = getMeetingDetails()
        openMeetingScheduler(openExternal, meetingDetails)
      }

      toast.success(createMeeting ? 'Meeting scheduled successfully!' : 'Opening calendar...')
      onClose()
      resetForm()
    } catch (error) {
      console.error('Failed to create meeting:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownloadICS = async () => {
    if (!title.trim()) {
      toast.error('Please enter a meeting title')
      return
    }
    if (selectedAttendees.length === 0) {
      toast.error('Please select at least one attendee')
      return
    }

    // Save to database first if available
    if (createMeeting) {
      setIsSaving(true)
      try {
        const data = getCreateMeetingData()
        const meeting = await createMeeting(data)
        onMeetingCreated?.(meeting)
      } catch (error) {
        console.error('Failed to save meeting:', error)
      } finally {
        setIsSaving(false)
      }
    }

    const meetingDetails = getMeetingDetails()
    downloadICSFile(meetingDetails)
    toast.success('Meeting invite downloaded')
  }

  const resetForm = () => {
    setStep('template')
    setSelectedTemplate(null)
    setTitle(defaultTitle)
    setDescription('')
    setSelectedAttendees(preselectedMembers)
    setIsRecurring(false)
    setLocation('')
    setPlatform(undefined)
    const { start } = getDefaultMeetingTimes()
    setSelectedDate(start.toISOString().split('T')[0])
    setStartTime(start.toTimeString().slice(0, 5))
    setDuration(30)
  }

  const handleClose = () => {
    onClose()
    resetForm()
  }

  const canProceed = useMemo(() => {
    if (step === 'details') {
      return title.trim().length > 0 && selectedAttendees.length > 0
    }
    return true
  }, [step, title, selectedAttendees])

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <VideoCamera size={24} weight="duotone" className="text-primary" />
            Schedule Meeting
          </DialogTitle>
          <DialogDescription>
            {step === 'template' && 'Choose a meeting template to get started'}
            {step === 'details' && 'Configure meeting details and select attendees'}
            {step === 'schedule' && 'Save to calendar or sync with external apps'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Step 1: Template Selection */}
          {step === 'template' && (
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid grid-cols-2 gap-3">
                {meetingTemplates.map(template => (
                  <Card 
                    key={template.id}
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary hover:shadow-md",
                      selectedTemplate === template.id && "border-primary bg-primary/5"
                    )}
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{template.icon}</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold">{template.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {template.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              <Clock size={10} className="mr-1" />
                              {template.defaultDuration} min
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Step 2: Meeting Details */}
          {step === 'details' && (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="meeting-title">Meeting Title</Label>
                  <Input
                    id="meeting-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter meeting title"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="meeting-description">Description</Label>
                  <Textarea
                    id="meeting-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What's this meeting about?"
                    rows={3}
                  />
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="meeting-date">Date</Label>
                    <Input
                      id="meeting-date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meeting-time">Start Time</Label>
                    <Input
                      id="meeting-time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meeting-duration">Duration</Label>
                    <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Recurring */}
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div>
                    <Label className="text-sm font-medium">Recurring Meeting</Label>
                    <p className="text-xs text-muted-foreground">Schedule this meeting to repeat</p>
                  </div>
                  <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
                </div>

                {isRecurring && (
                  <div className="space-y-2 pl-4 border-l-2 border-primary/30">
                    <Label>Repeat Pattern</Label>
                    <Select value={recurrencePattern} onValueChange={(v: any) => setRecurrencePattern(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Separator />

                {/* Attendees */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Users size={16} />
                      Attendees ({selectedAttendees.length})
                    </Label>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                        Select All
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
                        Clear
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-1">
                    {teamMembers.map(member => {
                      const isSelected = selectedAttendees.some(m => m.id === member.id)
                      return (
                        <div
                          key={member.id}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all",
                            isSelected 
                              ? "border-primary bg-primary/5" 
                              : "hover:border-muted-foreground/50"
                          )}
                          onClick={() => handleToggleAttendee(member)}
                        >
                          <Checkbox checked={isSelected} />
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={member.avatarUrl} alt={member.name} />
                            <AvatarFallback className="text-xs">
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{member.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                          </div>
                          {member.isOnline && (
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}

          {/* Step 3: Schedule */}
          {step === 'schedule' && (
            <div className="space-y-4 py-4">
              {/* Meeting Summary */}
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2">{title}</h4>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CalendarBlank size={14} />
                      {new Date(`${selectedDate}T${startTime}`).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      {startTime} ({duration} min)
                    </div>
                    <div className="flex items-center gap-1">
                      <Users size={14} />
                      {selectedAttendees.length} attendee{selectedAttendees.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  {isRecurring && (
                    <Badge variant="secondary" className="mt-2">
                      Repeats {recurrencePattern}
                    </Badge>
                  )}
                </CardContent>
              </Card>

              {/* Save to Calendar Option */}
              {createMeeting && (
                <>
                  <Button 
                    className="w-full justify-start h-14 gap-3"
                    onClick={() => handleSaveMeeting()}
                    disabled={isSaving}
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
                      <FloppyDisk size={20} weight="duotone" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Save to Calendar</p>
                      <p className="text-xs opacity-80">Add meeting to your team calendar</p>
                    </div>
                    <Check size={16} className="ml-auto" />
                  </Button>
                  <Separator />
                </>
              )}

              {/* Platform Options */}
              <div className="space-y-3">
                <Label>Also sync with external calendar:</Label>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-14 gap-3"
                  onClick={() => handleSaveMeeting('google')}
                  disabled={isSaving}
                >
                  <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shadow-sm border">
                    <GoogleLogo size={20} weight="bold" className="text-[#4285F4]" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Google Calendar</p>
                    <p className="text-xs text-muted-foreground">Save & open in Google Calendar</p>
                  </div>
                  <ArrowRight size={16} className="ml-auto text-muted-foreground" />
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full justify-start h-14 gap-3"
                  onClick={() => handleSaveMeeting('teams')}
                  disabled={isSaving}
                >
                  <div className="h-8 w-8 rounded-lg bg-[#5059C9] flex items-center justify-center shadow-sm">
                    <MicrosoftTeamsLogo size={20} weight="fill" className="text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Microsoft Teams</p>
                    <p className="text-xs text-muted-foreground">Save & create Teams meeting</p>
                  </div>
                  <ArrowRight size={16} className="ml-auto text-muted-foreground" />
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full justify-start h-14 gap-3"
                  onClick={() => handleSaveMeeting('outlook')}
                  disabled={isSaving}
                >
                  <div className="h-8 w-8 rounded-lg bg-[#0078D4] flex items-center justify-center shadow-sm">
                    <CalendarBlank size={20} weight="fill" className="text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Outlook Calendar</p>
                    <p className="text-xs text-muted-foreground">Save & open in Outlook</p>
                  </div>
                  <ArrowRight size={16} className="ml-auto text-muted-foreground" />
                </Button>

                <Separator />

                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-3"
                  onClick={handleDownloadICS}
                  disabled={isSaving}
                >
                  <Export size={18} />
                  <span>Download .ics file</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            {step !== 'template' && (
              <Button 
                variant="ghost" 
                onClick={() => setStep(step === 'schedule' ? 'details' : 'template')}
                disabled={isSaving}
              >
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isSaving}>
              Cancel
            </Button>
            {step === 'details' && (
              <Button 
                onClick={() => setStep('schedule')}
                disabled={!canProceed}
              >
                Continue
                <ArrowRight size={16} className="ml-2" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CreateMeetingDialog

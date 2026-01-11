import { Task } from './collaboration-data'

export interface ICalEvent {
  uid: string
  summary: string
  description?: string
  startDate: Date
  endDate?: Date
  priority?: number
  status?: 'TENTATIVE' | 'CONFIRMED' | 'CANCELLED'
  location?: string
}

const formatICalDate = (date: Date): string => {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const seconds = String(date.getUTCSeconds()).padStart(2, '0')
  
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
}

const escapeICalText = (text: string): string => {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

const taskStatusToICalStatus = (status: Task['status']): ICalEvent['status'] => {
  switch (status) {
    case 'done':
      return 'CONFIRMED'
    case 'in-progress':
    case 'review':
      return 'CONFIRMED'
    case 'todo':
    default:
      return 'TENTATIVE'
  }
}

const taskPriorityToICalPriority = (priority: Task['priority']): number => {
  switch (priority) {
    case 'critical':
      return 1
    case 'high':
      return 3
    case 'medium':
      return 5
    case 'low':
      return 7
    default:
      return 5
  }
}

export const generateICalFromTasks = (tasks: Task[], calendarName: string = 'Task Deadlines'): string => {
  const now = new Date()
  const timestamp = formatICalDate(now)
  
  const events: ICalEvent[] = tasks
    .filter(task => task.dueDate)
    .map(task => ({
      uid: `task-${task.id}@enterprise-automation`,
      summary: task.title,
      description: task.description,
      startDate: new Date(task.dueDate!),
      priority: taskPriorityToICalPriority(task.priority),
      status: taskStatusToICalStatus(task.status),
      location: task.contextType === 'service' ? 'Service Implementation' : 
                task.contextType === 'workflow' ? 'Workflow Design' :
                task.contextType === 'roadmap' ? 'Roadmap Task' : 'General Task'
    }))
  
  let ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Enterprise Automation//Task Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICalText(calendarName)}`,
    'X-WR-TIMEZONE:UTC',
    `X-WR-CALDESC:${escapeICalText('Task deadlines from Enterprise Automation Architecture')}`
  ]
  
  events.forEach(event => {
    const endDate = event.endDate || new Date(event.startDate.getTime() + 60 * 60 * 1000)
    
    ical.push(
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTAMP:${timestamp}`,
      `DTSTART:${formatICalDate(event.startDate)}`,
      `DTEND:${formatICalDate(endDate)}`,
      `SUMMARY:${escapeICalText(event.summary)}`
    )
    
    if (event.description) {
      ical.push(`DESCRIPTION:${escapeICalText(event.description)}`)
    }
    
    if (event.priority) {
      ical.push(`PRIORITY:${event.priority}`)
    }
    
    if (event.status) {
      ical.push(`STATUS:${event.status}`)
    }
    
    if (event.location) {
      ical.push(`LOCATION:${escapeICalText(event.location)}`)
    }
    
    ical.push(
      'BEGIN:VALARM',
      'TRIGGER:-PT24H',
      'ACTION:DISPLAY',
      `DESCRIPTION:Reminder: ${escapeICalText(event.summary)}`,
      'END:VALARM',
      'END:VEVENT'
    )
  })
  
  ical.push('END:VCALENDAR')
  
  return ical.join('\r\n')
}

export const downloadICalFile = (icalContent: string, filename: string = 'tasks.ics') => {
  const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const getGoogleCalendarUrl = (tasks: Task[]): string => {
  if (tasks.length === 0) return ''
  
  const task = tasks[0]
  if (!task.dueDate) return ''
  
  const startDate = new Date(task.dueDate)
  const endDate = new Date(task.dueDate)
  endDate.setHours(endDate.getHours() + 1)
  
  const formatGoogleDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: task.title,
    details: task.description || '',
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
    location: task.contextType === 'service' ? 'Service Implementation' : 
              task.contextType === 'workflow' ? 'Workflow Design' :
              task.contextType === 'roadmap' ? 'Roadmap Task' : 'General Task'
  })
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export const exportTasksToICal = (tasks: Task[], calendarName?: string) => {
  const icalContent = generateICalFromTasks(tasks, calendarName)
  const filename = `${calendarName?.toLowerCase().replace(/\s+/g, '-') || 'tasks'}-${Date.now()}.ics`
  downloadICalFile(icalContent, filename)
}

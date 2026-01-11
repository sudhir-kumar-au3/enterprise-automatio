import { Task, Comment, TeamMember, AccessLevel } from './collaboration-data'

export interface DataExport {
  version: string
  exportDate: number
  tasks: Task[]
  comments: Comment[]
  teamMembers: TeamMember[]
  settings: Record<string, any>
}

export interface DataValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export class DataService {
  static readonly VERSION = '1.0.0'

  static validateTask(task: Partial<Task>): DataValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!task.id) errors.push('Task missing required field: id')
    if (!task.title?.trim()) errors.push('Task missing required field: title')
    if (!task.status) errors.push('Task missing required field: status')
    if (!task.priority) errors.push('Task missing required field: priority')
    if (!task.creatorId) errors.push('Task missing required field: creatorId')
    if (!task.createdAt) errors.push('Task missing required field: createdAt')
    if (!task.updatedAt) errors.push('Task missing required field: updatedAt')

    if (task.status && !['todo', 'in-progress', 'review', 'done'].includes(task.status)) {
      errors.push(`Invalid task status: ${task.status}`)
    }

    if (task.priority && !['low', 'medium', 'high', 'critical'].includes(task.priority)) {
      errors.push(`Invalid task priority: ${task.priority}`)
    }

    if (task.dueDate && task.dueDate < 0) {
      errors.push('Invalid due date timestamp')
    }

    if (task.dependencies?.length) {
      if (task.dependencies.includes(task.id!)) {
        errors.push('Task cannot depend on itself')
      }
      if (new Set(task.dependencies).size !== task.dependencies.length) {
        warnings.push('Task has duplicate dependencies')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  static validateComment(comment: Partial<Comment>): DataValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!comment.id) errors.push('Comment missing required field: id')
    if (!comment.authorId) errors.push('Comment missing required field: authorId')
    if (!comment.content?.trim()) errors.push('Comment missing required field: content')
    if (!comment.timestamp) errors.push('Comment missing required field: timestamp')
    if (!comment.contextType) errors.push('Comment missing required field: contextType')
    if (!comment.contextId) errors.push('Comment missing required field: contextId')

    if (comment.contextType && !['service', 'workflow', 'roadmap', 'general'].includes(comment.contextType)) {
      errors.push(`Invalid comment context type: ${comment.contextType}`)
    }

    if (comment.timestamp && comment.timestamp < 0) {
      errors.push('Invalid timestamp')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  static validateTeamMember(member: Partial<TeamMember>): DataValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!member.id) errors.push('Team member missing required field: id')
    if (!member.name?.trim()) errors.push('Team member missing required field: name')
    if (!member.email?.trim()) errors.push('Team member missing required field: email')
    if (!member.role) errors.push('Team member missing required field: role')
    if (!member.accessLevel) errors.push('Team member missing required field: accessLevel')

    if (member.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email)) {
      errors.push('Invalid email format')
    }

    if (member.role && !['architect', 'developer', 'devops', 'product'].includes(member.role)) {
      errors.push(`Invalid role: ${member.role}`)
    }

    if (member.accessLevel && !['owner', 'admin', 'member', 'viewer'].includes(member.accessLevel)) {
      errors.push(`Invalid access level: ${member.accessLevel}`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  static validateTaskDependencies(tasks: Task[]): DataValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const taskIds = new Set(tasks.map(t => t.id))

    for (const task of tasks) {
      if (!task.dependencies?.length) continue

      for (const depId of task.dependencies) {
        if (!taskIds.has(depId)) {
          warnings.push(`Task "${task.title}" has dependency on non-existent task: ${depId}`)
        }
      }

      if (this.hasCircularDependency(task.id, task.dependencies, tasks)) {
        errors.push(`Task "${task.title}" has circular dependency`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  static hasCircularDependency(taskId: string, dependencies: string[], allTasks: Task[], visited = new Set<string>()): boolean {
    if (visited.has(taskId)) return true
    
    visited.add(taskId)
    
    for (const depId of dependencies) {
      const depTask = allTasks.find(t => t.id === depId)
      if (!depTask?.dependencies?.length) continue
      
      if (this.hasCircularDependency(depId, depTask.dependencies, allTasks, new Set(visited))) {
        return true
      }
    }
    
    return false
  }

  static exportData(tasks: Task[], comments: Comment[], teamMembers: TeamMember[], settings: Record<string, any> = {}): DataExport {
    return {
      version: this.VERSION,
      exportDate: Date.now(),
      tasks: tasks.map(t => ({ ...t })),
      comments: comments.map(c => ({ ...c })),
      teamMembers: teamMembers.map(m => ({ ...m })),
      settings: { ...settings }
    }
  }

  static importData(data: DataExport): DataValidationResult & { data?: DataExport } {
    const errors: string[] = []
    const warnings: string[] = []

    if (!data.version) {
      errors.push('Import data missing version')
    }

    if (!data.exportDate || typeof data.exportDate !== 'number') {
      errors.push('Import data missing or invalid export date')
    }

    if (!Array.isArray(data.tasks)) {
      errors.push('Import data missing or invalid tasks array')
    } else {
      for (const task of data.tasks) {
        const validation = this.validateTask(task)
        errors.push(...validation.errors.map(e => `Task validation: ${e}`))
        warnings.push(...validation.warnings.map(w => `Task validation: ${w}`))
      }
    }

    if (!Array.isArray(data.comments)) {
      errors.push('Import data missing or invalid comments array')
    } else {
      for (const comment of data.comments) {
        const validation = this.validateComment(comment)
        errors.push(...validation.errors.map(e => `Comment validation: ${e}`))
        warnings.push(...validation.warnings.map(w => `Comment validation: ${w}`))
      }
    }

    if (!Array.isArray(data.teamMembers)) {
      errors.push('Import data missing or invalid team members array')
    } else {
      for (const member of data.teamMembers) {
        const validation = this.validateTeamMember(member)
        errors.push(...validation.errors.map(e => `Team member validation: ${e}`))
        warnings.push(...validation.warnings.map(w => `Team member validation: ${w}`))
      }
    }

    const dependencyValidation = this.validateTaskDependencies(data.tasks || [])
    errors.push(...dependencyValidation.errors)
    warnings.push(...dependencyValidation.warnings)

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      data: errors.length === 0 ? data : undefined
    }
  }

  static downloadJSON(data: any, filename: string) {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  static async readJSONFile(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string)
          resolve(data)
        } catch (error) {
          reject(new Error('Invalid JSON file'))
        }
      }
      reader.onerror = () => reject(new Error('Error reading file'))
      reader.readAsText(file)
    })
  }

  static sanitizeTask(task: Task): Task {
    return {
      ...task,
      title: task.title.trim(),
      description: task.description?.trim() || '',
      tags: Array.from(new Set(task.tags || [])),
      dependencies: Array.from(new Set(task.dependencies || [])).filter(id => id !== task.id),
      comments: []
    }
  }

  static sanitizeComment(comment: Comment): Comment {
    return {
      ...comment,
      content: comment.content.trim(),
      mentions: Array.from(new Set(comment.mentions || [])),
      replies: []
    }
  }

  static sanitizeTeamMember(member: TeamMember): TeamMember {
    return {
      ...member,
      name: member.name.trim(),
      email: member.email.trim().toLowerCase(),
      customPermissions: member.customPermissions ? Array.from(new Set(member.customPermissions)) : undefined
    }
  }

  static generateBackup(tasks: Task[], comments: Comment[], teamMembers: TeamMember[]): string {
    const backup = this.exportData(tasks, comments, teamMembers, {
      backupDate: Date.now(),
      backupType: 'automatic'
    })
    return JSON.stringify(backup)
  }

  static restoreFromBackup(backupJson: string): DataValidationResult & { data?: DataExport } {
    try {
      const data = JSON.parse(backupJson)
      return this.importData(data)
    } catch (error) {
      return {
        isValid: false,
        errors: ['Invalid backup file: ' + (error as Error).message],
        warnings: []
      }
    }
  }

  static getDataStatistics(tasks: Task[], comments: Comment[], teamMembers: TeamMember[]) {
    const now = Date.now()
    const oneDayMs = 24 * 60 * 60 * 1000

    return {
      tasks: {
        total: tasks.length,
        byStatus: {
          todo: tasks.filter(t => t.status === 'todo').length,
          inProgress: tasks.filter(t => t.status === 'in-progress').length,
          review: tasks.filter(t => t.status === 'review').length,
          done: tasks.filter(t => t.status === 'done').length
        },
        byPriority: {
          low: tasks.filter(t => t.priority === 'low').length,
          medium: tasks.filter(t => t.priority === 'medium').length,
          high: tasks.filter(t => t.priority === 'high').length,
          critical: tasks.filter(t => t.priority === 'critical').length
        },
        overdue: tasks.filter(t => t.dueDate && t.dueDate < now && t.status !== 'done').length,
        dueSoon: tasks.filter(t => t.dueDate && t.dueDate > now && t.dueDate < now + 7 * oneDayMs && t.status !== 'done').length,
        withDependencies: tasks.filter(t => t.dependencies && t.dependencies.length > 0).length,
        unassigned: tasks.filter(t => !t.assigneeId).length
      },
      comments: {
        total: comments.length,
        resolved: comments.filter(c => c.isResolved).length,
        unresolved: comments.filter(c => !c.isResolved).length,
        byContext: {
          service: comments.filter(c => c.contextType === 'service').length,
          workflow: comments.filter(c => c.contextType === 'workflow').length,
          roadmap: comments.filter(c => c.contextType === 'roadmap').length,
          general: comments.filter(c => c.contextType === 'general').length
        }
      },
      teamMembers: {
        total: teamMembers.length,
        online: teamMembers.filter(m => m.isOnline).length,
        offline: teamMembers.filter(m => !m.isOnline).length,
        byRole: {
          architect: teamMembers.filter(m => m.role === 'architect').length,
          developer: teamMembers.filter(m => m.role === 'developer').length,
          devops: teamMembers.filter(m => m.role === 'devops').length,
          product: teamMembers.filter(m => m.role === 'product').length
        },
        byAccessLevel: {
          owner: teamMembers.filter(m => m.accessLevel === 'owner').length,
          admin: teamMembers.filter(m => m.accessLevel === 'admin').length,
          member: teamMembers.filter(m => m.accessLevel === 'member').length,
          viewer: teamMembers.filter(m => m.accessLevel === 'viewer').length
        }
      }
    }
  }
}

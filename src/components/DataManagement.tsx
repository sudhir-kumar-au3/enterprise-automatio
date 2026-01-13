import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Database,
  Download,
  Upload,
  ArrowClockwise,
  CheckCircle,
  Warning,
  XCircle,
  FileArrowDown,
  ChartBar,
  ShieldCheck,
  ClockCounterClockwise,
  Trash,
  Plus,
  SpinnerGap
} from '@phosphor-icons/react'
import { Task, Comment, TeamMember } from '@/lib/collaboration-data'
import { DataService, DataExport } from '@/lib/data-service'
import { useData } from '@/contexts/DataContext'
import { dataService } from '@/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface DataManagementProps {
  tasks: Task[]
  comments: Comment[]
  teamMembers: TeamMember[]
  onDataRestore: (data: DataExport) => void
}

export const DataManagement = ({ tasks, comments, teamMembers, onDataRestore }: DataManagementProps) => {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isCreatingBackup, setIsCreatingBackup] = useState(false)
  const [validationResults, setValidationResults] = useState<{
    tasks: number
    comments: number
    teamMembers: number
    errors: string[]
    warnings: string[]
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Use DataContext for backend API integration
  const { 
    backups, 
    isLoadingBackups,
    fetchBackups,
    createBackup: createBackupApi, 
    restoreBackup: restoreBackupApi, 
    deleteBackup: deleteBackupApi,
    statistics,
    fetchStatistics,
    isLoadingStats
  } = useData()

  // Fetch backups on mount
  useEffect(() => {
    fetchBackups()
    fetchStatistics()
  }, [fetchBackups, fetchStatistics])

  const stats = statistics ? {
    tasks: {
      total: statistics.tasks.total,
      byStatus: {
        todo: statistics.tasks.byStatus?.todo || 0,
        inProgress: statistics.tasks.byStatus?.['in-progress'] || 0,
        review: statistics.tasks.byStatus?.review || 0,
        done: statistics.tasks.byStatus?.done || 0,
      },
      overdue: statistics.tasks.overdue,
      dueSoon: statistics.tasks.dueSoon,
      withDependencies: 0,
      unassigned: 0,
    },
    comments: {
      total: statistics.comments.total,
      resolved: statistics.comments.resolved,
      unresolved: statistics.comments.unresolved,
    },
    teamMembers: {
      total: statistics.teamMembers.total,
      online: statistics.teamMembers.online,
      offline: statistics.teamMembers.total - statistics.teamMembers.online,
    }
  } : DataService.getDataStatistics(tasks, comments, teamMembers)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      // Try backend export first
      const response = await dataService.exportData()
      if (response.success && response.data) {
        const filename = `collaboration-backup-${new Date().toISOString().split('T')[0]}.json`
        DataService.downloadJSON(response.data, filename)
        toast.success('Data exported from server successfully')
      } else {
        // Fallback to local export
        const exportData = DataService.exportData(tasks, comments, teamMembers, {
          exportType: 'manual',
          userInitiated: true
        })
        const filename = `collaboration-backup-${new Date().toISOString().split('T')[0]}.json`
        DataService.downloadJSON(exportData, filename)
        toast.success('Data exported successfully')
      }
    } catch (error) {
      // Fallback to local export on error
      const exportData = DataService.exportData(tasks, comments, teamMembers, {
        exportType: 'manual',
        userInitiated: true
      })
      const filename = `collaboration-backup-${new Date().toISOString().split('T')[0]}.json`
      DataService.downloadJSON(exportData, filename)
      toast.success('Data exported locally')
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    try {
      const data = await DataService.readJSONFile(file)
      const validation = DataService.importData(data)

      if (!validation.isValid) {
        setValidationResults({
          tasks: 0,
          comments: 0,
          teamMembers: 0,
          errors: validation.errors,
          warnings: validation.warnings
        })
        toast.error(`Import failed: ${validation.errors.length} errors found`)
        return
      }

      // Try to import via backend API
      try {
        const response = await dataService.importData(data)
        if (response.success) {
          toast.success(`Data imported to server successfully`)
          // Refresh local state
          if (validation.data) {
            onDataRestore(validation.data)
          }
          // Refresh statistics
          fetchStatistics()
          return
        }
      } catch (apiError) {
        console.warn('Backend import failed, using local import', apiError)
      }

      // Fallback to local import
      if (validation.warnings.length > 0) {
        setValidationResults({
          tasks: data.tasks?.length || 0,
          comments: data.comments?.length || 0,
          teamMembers: data.teamMembers?.length || 0,
          errors: [],
          warnings: validation.warnings
        })
      }

      if (validation.data) {
        onDataRestore(validation.data)
        toast.success(`Data imported successfully: ${data.tasks?.length || 0} tasks, ${data.comments?.length || 0} comments, ${data.teamMembers?.length || 0} members`)
      }
    } catch (error) {
      toast.error('Failed to import data: ' + (error as Error).message)
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true)
    try {
      const success = await createBackupApi()
      if (success) {
        toast.success('Backup created successfully on server')
      } else {
        toast.error('Failed to create backup')
      }
    } catch (error) {
      toast.error('Failed to create backup: ' + (error as Error).message)
    } finally {
      setIsCreatingBackup(false)
    }
  }

  const handleRestoreBackup = async (backupId: string) => {
    try {
      const success = await restoreBackupApi(backupId)
      if (success) {
        toast.success('Backup restored successfully')
        // Refresh data after restore
        window.location.reload()
      } else {
        toast.error('Failed to restore backup')
      }
    } catch (error) {
      toast.error('Failed to restore backup: ' + (error as Error).message)
    }
  }

  const handleDeleteBackup = async (backupId: string) => {
    try {
      const success = await deleteBackupApi(backupId)
      if (success) {
        toast.success('Backup deleted')
      } else {
        toast.error('Failed to delete backup')
      }
    } catch (error) {
      toast.error('Failed to delete backup: ' + (error as Error).message)
    }
  }

  const handleValidate = () => {
    const errors: string[] = []
    const warnings: string[] = []

    tasks.forEach(task => {
      const validation = DataService.validateTask(task)
      errors.push(...validation.errors)
      warnings.push(...validation.warnings)
    })

    comments.forEach(comment => {
      const validation = DataService.validateComment(comment)
      errors.push(...validation.errors)
      warnings.push(...validation.warnings)
    })

    teamMembers.forEach(member => {
      const validation = DataService.validateTeamMember(member)
      errors.push(...validation.errors)
      warnings.push(...validation.warnings)
    })

    const depValidation = DataService.validateTaskDependencies(tasks)
    errors.push(...depValidation.errors)
    warnings.push(...depValidation.warnings)

    setValidationResults({
      tasks: tasks.length,
      comments: comments.length,
      teamMembers: teamMembers.length,
      errors,
      warnings
    })

    if (errors.length === 0 && warnings.length === 0) {
      toast.success('All data validated successfully')
    } else if (errors.length > 0) {
      toast.error(`Validation failed: ${errors.length} errors, ${warnings.length} warnings`)
    } else {
      toast.warning(`Validation completed with ${warnings.length} warnings`)
    }
  }

  const getTotalItems = () => tasks.length + comments.length + teamMembers.length

  return (
    <div className="space-y-6">
      {/* ...existing stats cards code... */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-blue-500/50 bg-blue-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Database size={20} weight="duotone" className="text-blue-600" />
              Storage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold">{isLoadingStats ? '...' : getTotalItems()}</div>
              <div className="text-sm text-muted-foreground">Total Items Stored</div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="text-center">
                  <div className="text-lg font-semibold">{tasks.length}</div>
                  <div className="text-xs text-muted-foreground">Tasks</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">{comments.length}</div>
                  <div className="text-xs text-muted-foreground">Comments</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">{teamMembers.length}</div>
                  <div className="text-xs text-muted-foreground">Members</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/50 bg-green-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle size={20} weight="duotone" className="text-green-600" />
              Health Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {validationResults ? (
                <>
                  {validationResults.errors.length === 0 && validationResults.warnings.length === 0 ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle size={24} weight="fill" />
                      <span className="font-semibold">All Good</span>
                    </div>
                  ) : validationResults.errors.length > 0 ? (
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle size={24} weight="fill" />
                      <span className="font-semibold">{validationResults.errors.length} Errors</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-yellow-600">
                      <Warning size={24} weight="fill" />
                      <span className="font-semibold">{validationResults.warnings.length} Warnings</span>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Last validated: {new Date().toLocaleTimeString()}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-muted-foreground">Not validated yet</div>
                  <Button size="sm" variant="outline" onClick={handleValidate} className="w-full">
                    Run Validation
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-500/50 bg-purple-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck size={20} weight="duotone" className="text-purple-600" />
              Data Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} weight="fill" className="text-green-600" />
                <span className="text-sm">Server Storage</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} weight="fill" className="text-green-600" />
                <span className="text-sm">Auto-sync</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} weight="fill" className="text-green-600" />
                <span className="text-sm">Cloud Backup</span>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                All data stored securely on the server
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartBar size={20} weight="duotone" />
            Data Statistics
          </CardTitle>
          <CardDescription>Detailed breakdown of your stored data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm">Tasks Overview</h4>
                <Badge variant="secondary">{stats.tasks.total} total</Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">To Do</div>
                  <div className="text-2xl font-bold">{stats.tasks.byStatus.todo}</div>
                  <Progress value={(stats.tasks.byStatus.todo / Math.max(stats.tasks.total, 1)) * 100} className="h-1" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">In Progress</div>
                  <div className="text-2xl font-bold">{stats.tasks.byStatus.inProgress}</div>
                  <Progress value={(stats.tasks.byStatus.inProgress / Math.max(stats.tasks.total, 1)) * 100} className="h-1" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Review</div>
                  <div className="text-2xl font-bold">{stats.tasks.byStatus.review}</div>
                  <Progress value={(stats.tasks.byStatus.review / Math.max(stats.tasks.total, 1)) * 100} className="h-1" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Done</div>
                  <div className="text-2xl font-bold">{stats.tasks.byStatus.done}</div>
                  <Progress value={(stats.tasks.byStatus.done / Math.max(stats.tasks.total, 1)) * 100} className="h-1" />
                </div>
              </div>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Overdue:</span>
                  <span className="ml-2 font-semibold text-red-600">{stats.tasks.overdue}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Due Soon:</span>
                  <span className="ml-2 font-semibold text-yellow-600">{stats.tasks.dueSoon}</span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm">Comments</h4>
                  <Badge variant="secondary">{stats.comments.total} total</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Resolved</span>
                    <span className="font-semibold">{stats.comments.resolved}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Unresolved</span>
                    <span className="font-semibold">{stats.comments.unresolved}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm">Team Members</h4>
                  <Badge variant="secondary">{stats.teamMembers.total} total</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Online</span>
                    <span className="font-semibold text-green-600">{stats.teamMembers.online}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Offline</span>
                    <span className="font-semibold">{stats.teamMembers.offline}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Management Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileArrowDown size={20} weight="duotone" />
            Data Management Actions
          </CardTitle>
          <CardDescription>Export, import, and validate your collaboration data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <Button
              onClick={handleExport}
              disabled={isExporting || getTotalItems() === 0}
              className="gap-2"
              variant="outline"
            >
              {isExporting ? <SpinnerGap size={18} className="animate-spin" /> : <Download size={18} />}
              {isExporting ? 'Exporting...' : 'Export Data'}
            </Button>

            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="gap-2"
              variant="outline"
            >
              {isImporting ? <SpinnerGap size={18} className="animate-spin" /> : <Upload size={18} />}
              {isImporting ? 'Importing...' : 'Import Data'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />

            <Button
              onClick={handleValidate}
              disabled={getTotalItems() === 0}
              className="gap-2"
              variant="outline"
            >
              <ArrowClockwise size={18} />
              Validate Data
            </Button>
          </div>

          {validationResults && (validationResults.errors.length > 0 || validationResults.warnings.length > 0) && (
            <div className="space-y-3">
              {validationResults.errors.length > 0 && (
                <Alert variant="destructive">
                  <XCircle size={18} weight="fill" />
                  <AlertTitle>Validation Errors ({validationResults.errors.length})</AlertTitle>
                  <AlertDescription>
                    <ScrollArea className="h-32 mt-2">
                      <ul className="text-xs space-y-1">
                        {validationResults.errors.map((error, idx) => (
                          <li key={idx}>• {error}</li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </AlertDescription>
                </Alert>
              )}

              {validationResults.warnings.length > 0 && (
                <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10">
                  <Warning size={18} weight="fill" className="text-yellow-600" />
                  <AlertTitle className="text-yellow-900 dark:text-yellow-400">Validation Warnings ({validationResults.warnings.length})</AlertTitle>
                  <AlertDescription className="text-yellow-800 dark:text-yellow-300">
                    <ScrollArea className="h-32 mt-2">
                      <ul className="text-xs space-y-1">
                        {validationResults.warnings.map((warning, idx) => (
                          <li key={idx}>• {warning}</li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <Alert>
            <Database size={18} weight="fill" />
            <AlertTitle>About Data Storage</AlertTitle>
            <AlertDescription className="text-sm">
              Your data is stored securely on the server with automatic backups. 
              Use Export to download a local copy, and Import to restore data from a backup file.
              Server backups are managed in the section below.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Server Backups */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClockCounterClockwise size={20} weight="duotone" />
                Server Backups
              </CardTitle>
              <CardDescription>Create and manage backups stored on the server</CardDescription>
            </div>
            <Button
              onClick={handleCreateBackup}
              disabled={isCreatingBackup}
              className="gap-2"
            >
              {isCreatingBackup ? <SpinnerGap size={16} className="animate-spin" /> : <Plus size={16} />}
              Create Backup
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {isLoadingBackups ? (
              <div className="text-center py-8">
                <SpinnerGap size={32} className="mx-auto text-muted-foreground mb-2 animate-spin" />
                <p className="text-sm text-muted-foreground">Loading backups...</p>
              </div>
            ) : backups.length === 0 ? (
              <div className="text-center py-8">
                <ClockCounterClockwise size={48} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No server backups yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click "Create Backup" to create your first server backup
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="secondary">{backups.length} backups stored</Badge>
                </div>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {[...backups].map((backup, index) => {
                      const backupDate = new Date(backup.timestamp)
                      const isRecent = Date.now() - backup.timestamp < 60 * 60 * 1000
                      
                      return (
                        <Card key={backup.id} className={cn("p-3", isRecent && "border-green-500/50 bg-green-500/5")}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">
                                  Backup #{backups.length - index}
                                </p>
                                {isRecent && (
                                  <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-700">
                                    Recent
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {backup.type}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {backupDate.toLocaleString()} ({getRelativeTime(backup.timestamp)})
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRestoreBackup(backup.id)}
                                className="gap-1"
                              >
                                <ArrowClockwise size={14} />
                                Restore
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteBackup(backup.id)}
                              >
                                <Trash size={14} />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function getRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / (60 * 1000))
  const hours = Math.floor(diff / (60 * 60 * 1000))
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

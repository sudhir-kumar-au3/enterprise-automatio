import { useState, useRef } from 'react'
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
  Trash
} from '@phosphor-icons/react'
import { Task, Comment, TeamMember } from '@/lib/collaboration-data'
import { DataService, DataExport } from '@/lib/data-service'
import { useAutoBackup } from '@/hooks/use-auto-backup'
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
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true)
  const [validationResults, setValidationResults] = useState<{
    tasks: number
    comments: number
    teamMembers: number
    errors: string[]
    warnings: string[]
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { backups, restoreBackup, deleteBackup, clearAllBackups } = useAutoBackup(
    tasks,
    comments,
    teamMembers,
    autoBackupEnabled
  )

  const stats = DataService.getDataStatistics(tasks, comments, teamMembers)

  const handleExport = () => {
    setIsExporting(true)
    try {
      const exportData = DataService.exportData(tasks, comments, teamMembers, {
        exportType: 'manual',
        userInitiated: true
      })
      
      const filename = `collaboration-backup-${new Date().toISOString().split('T')[0]}.json`
      DataService.downloadJSON(exportData, filename)
      
      toast.success('Data exported successfully')
    } catch (error) {
      toast.error('Failed to export data: ' + (error as Error).message)
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
              <div className="text-3xl font-bold">{getTotalItems()}</div>
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
                <span className="text-sm">Local Storage</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} weight="fill" className="text-green-600" />
                <span className="text-sm">Auto-persist</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} weight="fill" className="text-green-600" />
                <span className="text-sm">Export/Import</span>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                All data stored securely in your browser
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                  <Progress value={(stats.tasks.byStatus.todo / stats.tasks.total) * 100} className="h-1" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">In Progress</div>
                  <div className="text-2xl font-bold">{stats.tasks.byStatus.inProgress}</div>
                  <Progress value={(stats.tasks.byStatus.inProgress / stats.tasks.total) * 100} className="h-1" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Review</div>
                  <div className="text-2xl font-bold">{stats.tasks.byStatus.review}</div>
                  <Progress value={(stats.tasks.byStatus.review / stats.tasks.total) * 100} className="h-1" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Done</div>
                  <div className="text-2xl font-bold">{stats.tasks.byStatus.done}</div>
                  <Progress value={(stats.tasks.byStatus.done / stats.tasks.total) * 100} className="h-1" />
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
                <div>
                  <span className="text-muted-foreground">Dependencies:</span>
                  <span className="ml-2 font-semibold">{stats.tasks.withDependencies}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Unassigned:</span>
                  <span className="ml-2 font-semibold">{stats.tasks.unassigned}</span>
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
              <Download size={18} />
              {isExporting ? 'Exporting...' : 'Export Data'}
            </Button>

            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="gap-2"
              variant="outline"
            >
              <Upload size={18} />
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
                <Alert className="border-yellow-500 bg-yellow-50">
                  <Warning size={18} weight="fill" className="text-yellow-600" />
                  <AlertTitle className="text-yellow-900">Validation Warnings ({validationResults.warnings.length})</AlertTitle>
                  <AlertDescription className="text-yellow-800">
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
              Your data is stored securely in your browser using persistent local storage. 
              All changes are automatically saved. Use Export to create backups, and Import to restore data from a backup file.
              Data validation ensures integrity of tasks, comments, and team member information.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClockCounterClockwise size={20} weight="duotone" />
                Automatic Backups
              </CardTitle>
              <CardDescription>System automatically creates backups every 5 minutes</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="auto-backup"
                checked={autoBackupEnabled}
                onCheckedChange={setAutoBackupEnabled}
              />
              <Label htmlFor="auto-backup" className="cursor-pointer text-sm">
                {autoBackupEnabled ? 'Enabled' : 'Disabled'}
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {backups.length === 0 ? (
              <div className="text-center py-8">
                <ClockCounterClockwise size={48} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No automatic backups yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {autoBackupEnabled ? 'First backup will be created within 5 minutes' : 'Enable automatic backups to create restore points'}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="secondary">{backups.length} backups stored</Badge>
                  {backups.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        clearAllBackups()
                        toast.success('All backups cleared')
                      }}
                      className="gap-1 text-destructive hover:text-destructive"
                    >
                      <Trash size={16} />
                      Clear All
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {[...backups].reverse().map((backup, index) => {
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
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {backupDate.toLocaleString()} ({getRelativeTime(backup.timestamp)})
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const result = restoreBackup(backup.id)
                                  if (result) {
                                    const data = JSON.parse(backup.data)
                                    onDataRestore(data)
                                    toast.success('Backup restored successfully')
                                  } else {
                                    toast.error('Failed to restore backup')
                                  }
                                }}
                                className="gap-1"
                              >
                                <ArrowClockwise size={14} />
                                Restore
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  deleteBackup(backup.id)
                                  toast.success('Backup deleted')
                                }}
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

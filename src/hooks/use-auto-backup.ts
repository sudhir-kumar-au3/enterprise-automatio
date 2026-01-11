import { useEffect, useRef } from 'react'
import { useKV } from '@github/spark/hooks'
import { Task, Comment, TeamMember } from '@/lib/collaboration-data'
import { DataService } from '@/lib/data-service'

const BACKUP_INTERVAL = 5 * 60 * 1000
const MAX_BACKUPS = 10
const BACKUP_KEY_PREFIX = 'auto-backup-'

export interface Backup {
  id: string
  timestamp: number
  data: string
}

export function useAutoBackup(
  tasks: Task[],
  comments: Comment[],
  teamMembers: TeamMember[],
  enabled: boolean = true
) {
  const [backups, setBackups] = useKV<Backup[]>('auto-backups', [])
  const lastBackupTime = useRef<number>(0)
  const backupTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!enabled) {
      if (backupTimer.current) {
        clearInterval(backupTimer.current)
        backupTimer.current = null
      }
      return
    }

    const createBackup = () => {
      const now = Date.now()
      
      if (now - lastBackupTime.current < BACKUP_INTERVAL) {
        return
      }

      try {
        const backupData = DataService.generateBackup(tasks, comments, teamMembers)
        const backup: Backup = {
          id: `backup-${now}`,
          timestamp: now,
          data: backupData
        }

        setBackups(current => {
          const newBackups = [...(current || []), backup]
          if (newBackups.length > MAX_BACKUPS) {
            return newBackups.slice(-MAX_BACKUPS)
          }
          return newBackups
        })

        lastBackupTime.current = now
      } catch (error) {
        console.error('Auto-backup failed:', error)
      }
    }

    backupTimer.current = setInterval(createBackup, BACKUP_INTERVAL)

    createBackup()

    return () => {
      if (backupTimer.current) {
        clearInterval(backupTimer.current)
      }
    }
  }, [tasks, comments, teamMembers, enabled, setBackups])

  const restoreBackup = (backupId: string): boolean => {
    const backup = (backups || []).find(b => b.id === backupId)
    if (!backup) return false

    try {
      const result = DataService.restoreFromBackup(backup.data)
      return result.isValid
    } catch (error) {
      console.error('Restore failed:', error)
      return false
    }
  }

  const deleteBackup = (backupId: string) => {
    setBackups(current => (current || []).filter(b => b.id !== backupId))
  }

  const clearAllBackups = () => {
    setBackups([])
  }

  return {
    backups: backups || [],
    restoreBackup,
    deleteBackup,
    clearAllBackups,
    lastBackupTime: lastBackupTime.current
  }
}

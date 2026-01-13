import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { 
  Users, 
  ChatCircleDots, 
  CheckSquare, 
  Plus, 
  CalendarBlank,
  ArrowsDownUp,
  Database
} from '@phosphor-icons/react'
import { mockTeamMembers, Comment, Task, TeamMember, hasPermission, AccessLevel } from '@/lib/collaboration-data'
import { toast } from 'sonner'
import { DataExport } from '@/lib/data-service'
import { DataManagement } from '@/components/DataManagement'
import CalendarView from '@/components/CalendarView'
import WorkloadBalancing from '@/components/WorkloadBalancing'
import { useAuth, useNavigation } from '@/contexts'
import { useTasks, useComments, useTeamMembers } from '@/hooks'
import { Loader2 } from 'lucide-react'

// Import modular collaboration components
import {
  TasksView,
  CommentsView,
  TeamView,
  CreateTaskDialog,
  OverviewTab
} from '@/components/collaboration'

const CollaborationView = () => {
  const { user } = useAuth()
  const { activeTab, setActiveTab, isCreateTaskOpen, setIsCreateTaskOpen } = useNavigation()
  const { 
    tasks, 
    setTasks, 
    isLoading: tasksLoading,
    createTask: createTaskApi,
    updateTask: updateTaskApi,
    updateTaskStatus: updateTaskStatusApi,
    deleteTask: deleteTaskApi
  } = useTasks()
  const { 
    comments, 
    setComments, 
    isLoading: commentsLoading,
    createComment: createCommentApi,
    toggleResolve: toggleResolveApi,
    deleteComment: deleteCommentApi
  } = useComments()
  const { 
    members: teamMembers, 
    setMembers: setTeamMembers, 
    isLoading: teamMembersLoading,
    updateMember: updateMemberApi,
    createMember: createMemberApi,
    deleteMember: deleteMemberApi
  } = useTeamMembers()

  const fixTeamMembersData = (members: TeamMember[]): TeamMember[] => {
    let hasFixed = false
    const fixed = members.map(member => {
      if (!member.accessLevel) {
        hasFixed = true
        return {
          ...member,
          accessLevel: 'member' as AccessLevel
        }
      }
      return member
    })
    
    if (hasFixed) {
      setTeamMembers(() => fixed)
      toast.info('Fixed team member data with missing access levels')
    }
    
    return fixed
  }

  const allMembers = teamMembers && teamMembers.length > 0 ? fixTeamMembersData(teamMembers) : mockTeamMembers
  const currentUser = allMembers[0]

  const handleDataRestore = (data: DataExport) => {
    setTasks(() => data.tasks)
    setComments(() => data.comments)
    setTeamMembers(() => data.teamMembers)
  }

  if (tasksLoading || commentsLoading || teamMembersLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin" size={48} />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold mb-1">
            Team Collaboration
          </h2>
          <p className="text-sm text-muted-foreground">
            Coordinate tasks, share feedback, and track progress
          </p>
        </div>
        <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
          <DialogTrigger asChild>
            <Button 
              className="gap-2"
              disabled={!hasPermission(currentUser, 'create_tasks')}
            >
              <Plus size={18} weight="bold" />
              <span className="hidden sm:inline">Create Task</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <CreateTaskDialog
              onClose={() => setIsCreateTaskOpen(false)}
              onCreate={async (task) => {
                try {
                  const result = await createTaskApi({
                    title: task.title,
                    description: task.description,
                    status: task.status,
                    priority: task.priority,
                    assigneeId: task.assigneeId,
                    contextType: task.contextType,
                    contextId: task.contextId,
                    dueDate: task.dueDate,
                    tags: task.tags,
                    dependencies: task.dependencies
                  })
                  if (result.success && result.data) {
                    setTasks(current => [...(current || []), result.data!])
                    setIsCreateTaskOpen(false)
                    toast.success('Task created successfully')
                  } else {
                    toast.error(result.error || 'Failed to create task')
                  }
                } catch (error) {
                  toast.error('Failed to create task')
                }
              }}
              currentUser={currentUser}
              teamMembers={allMembers}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 sm:grid-cols-7 w-full max-w-5xl h-auto gap-1 bg-muted p-1">
          <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-background">
            <Users size={16} weight="regular" />
            <span className="hidden sm:inline text-sm">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2 data-[state=active]:bg-background">
            <CheckSquare size={16} weight="regular" />
            <span className="hidden sm:inline text-sm">Tasks</span>
            <Badge variant="secondary" className="ml-1 text-xs">
              {(tasks || []).filter(t => t.status !== 'done').length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="workload" className="gap-2 data-[state=active]:bg-background">
            <ArrowsDownUp size={16} weight="regular" />
            <span className="hidden sm:inline text-sm">Workload</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2 data-[state=active]:bg-background">
            <CalendarBlank size={16} weight="regular" />
            <span className="hidden sm:inline text-sm">Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="comments" className="gap-2 data-[state=active]:bg-background">
            <ChatCircleDots size={16} weight="regular" />
            <span className="hidden sm:inline text-sm">Comments</span>
            <Badge variant="secondary" className="ml-1 text-xs">
              {(comments || []).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2 data-[state=active]:bg-background">
            <Users size={16} weight="regular" />
            <span className="hidden sm:inline text-sm">Team</span>
            <Badge variant="secondary" className="ml-1 text-xs">
              {allMembers.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2 data-[state=active]:bg-background">
            <Database size={16} weight="regular" />
            <span className="hidden sm:inline text-sm">Data</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <OverviewTab
            currentUser={currentUser}
            allMembers={allMembers}
            tasks={tasks || []}
            comments={comments || []}
          />
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <TasksView
            tasks={tasks || []}
            setTasks={setTasks}
            teamMembers={allMembers}
            currentUser={currentUser}
            updateTaskStatusApi={updateTaskStatusApi}
            updateTaskApi={updateTaskApi}
          />
        </TabsContent>

        <TabsContent value="workload" className="space-y-6">
          <WorkloadBalancing
            tasks={tasks || []}
            teamMembers={allMembers}
            onReassignTask={async (taskId, newAssigneeId) => {
              try {
                const result = await updateTaskApi(taskId, { assigneeId: newAssigneeId })
                if (result.success && result.data) {
                  setTasks(current =>
                    (current || []).map(t => t.id === taskId ? { ...t, assigneeId: newAssigneeId, updatedAt: Date.now() } : t)
                  )
                  toast.success('Task reassigned successfully')
                } else {
                  toast.error(result.error || 'Failed to reassign task')
                }
              } catch (error) {
                toast.error('Failed to reassign task')
              }
            }}
          />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <CalendarView
            tasks={tasks || []}
            teamMembers={allMembers}
          />
        </TabsContent>

        <TabsContent value="comments" className="space-y-6">
          <CommentsView
            comments={comments || []}
            setComments={setComments}
            teamMembers={allMembers}
            currentUser={currentUser}
            createCommentApi={createCommentApi}
            toggleResolveApi={toggleResolveApi}
          />
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <TeamView 
            teamMembers={allMembers} 
            setTeamMembers={setTeamMembers}
            tasks={tasks || []} 
            comments={comments || []} 
            updateMemberApi={updateMemberApi}
            createMemberApi={createMemberApi}
            deleteMemberApi={deleteMemberApi}
          />
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <DataManagement
            tasks={tasks || []}
            comments={comments || []}
            teamMembers={allMembers}
            onDataRestore={handleDataRestore}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default CollaborationView

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
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="relative">
          <Loader2 className="animate-spin text-primary" size={40} />
          <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">Loading workspace data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">
            Team Collaboration
          </h2>
          <p className="text-sm text-muted-foreground">
            Coordinate tasks, share feedback, and track progress across your team
          </p>
        </div>
        <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
          <DialogTrigger asChild>
            <Button 
              size="lg"
              className="gap-2 shadow-lg shadow-primary/20"
              disabled={!hasPermission(currentUser, 'create_tasks')}
            >
              <Plus size={18} weight="bold" />
              <span>Create Task</span>
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

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="border-b">
          <TabsList className="h-12 w-full max-w-4xl justify-start gap-1 bg-transparent p-0">
            <TabsTrigger 
              value="overview" 
              className="relative h-12 rounded-none border-b-2 border-transparent px-4 font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none hover:text-foreground transition-colors"
            >
              <Users size={18} weight="regular" className="mr-2" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger 
              value="tasks" 
              className="relative h-12 rounded-none border-b-2 border-transparent px-4 font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none hover:text-foreground transition-colors"
            >
              <CheckSquare size={18} weight="regular" className="mr-2" />
              <span className="hidden sm:inline">Tasks</span>
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px] font-semibold">
                {(tasks || []).filter(t => t.status !== 'done').length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="workload" 
              className="relative h-12 rounded-none border-b-2 border-transparent px-4 font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none hover:text-foreground transition-colors"
            >
              <ArrowsDownUp size={18} weight="regular" className="mr-2" />
              <span className="hidden sm:inline">Workload</span>
            </TabsTrigger>
            <TabsTrigger 
              value="calendar" 
              className="relative h-12 rounded-none border-b-2 border-transparent px-4 font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none hover:text-foreground transition-colors"
            >
              <CalendarBlank size={18} weight="regular" className="mr-2" />
              <span className="hidden sm:inline">Calendar</span>
            </TabsTrigger>
            <TabsTrigger 
              value="comments" 
              className="relative h-12 rounded-none border-b-2 border-transparent px-4 font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none hover:text-foreground transition-colors"
            >
              <ChatCircleDots size={18} weight="regular" className="mr-2" />
              <span className="hidden sm:inline">Comments</span>
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px] font-semibold">
                {(comments || []).length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="team" 
              className="relative h-12 rounded-none border-b-2 border-transparent px-4 font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none hover:text-foreground transition-colors"
            >
              <Users size={18} weight="regular" className="mr-2" />
              <span className="hidden sm:inline">Team</span>
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px] font-semibold">
                {allMembers.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="data" 
              className="relative h-12 rounded-none border-b-2 border-transparent px-4 font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none hover:text-foreground transition-colors"
            >
              <Database size={18} weight="regular" className="mr-2" />
              <span className="hidden sm:inline">Data</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0 space-y-6 fade-in">
          <OverviewTab
            currentUser={currentUser}
            allMembers={allMembers}
            tasks={tasks || []}
            comments={comments || []}
          />
        </TabsContent>

        <TabsContent value="tasks" className="mt-0 space-y-6 fade-in">
          <TasksView
            tasks={tasks || []}
            setTasks={setTasks}
            teamMembers={allMembers}
            currentUser={currentUser}
            updateTaskStatusApi={updateTaskStatusApi}
            updateTaskApi={updateTaskApi}
          />
        </TabsContent>

        <TabsContent value="workload" className="mt-0 space-y-6 fade-in">
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

        <TabsContent value="calendar" className="mt-0 space-y-6 fade-in">
          <CalendarView
            tasks={tasks || []}
            teamMembers={allMembers}
          />
        </TabsContent>

        <TabsContent value="comments" className="mt-0 space-y-6 fade-in">
          <CommentsView
            comments={comments || []}
            setComments={setComments}
            teamMembers={allMembers}
            currentUser={currentUser}
            createCommentApi={createCommentApi}
            toggleResolveApi={toggleResolveApi}
          />
        </TabsContent>

        <TabsContent value="team" className="mt-0 space-y-6 fade-in">
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

        <TabsContent value="data" className="mt-0 space-y-6 fade-in">
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

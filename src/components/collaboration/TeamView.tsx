import { useState, Dispatch, SetStateAction, lazy, Suspense, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Users, 
  Plus, 
  DotsThree,
  ShieldCheck,
  MagnifyingGlass,
  FunnelSimple,
  ListBullets,
  SquaresFour,
  EnvelopeSimple,
  CheckCircle,
  Clock,
  ChatCircleDots,
  Lightning,
  Crown,
  UserCircle,
  Eye,
  Briefcase,
  Code,
  Gear,
  Package,
  TrendUp,
  Star,
  CaretDown,
  X,
  Sparkle,
  Pulse
} from '@phosphor-icons/react'
import { Comment, Task, TeamMember, mockTeamMembers, canManageTeam, AccessLevel } from '@/lib/collaboration-data'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { roleColors, accessLevelColors, accessLevelIcons } from './constants'
import AddEditMemberDialog from './AddEditMemberDialog'
import PermissionsDetailsDialog from '@/components/collaboration/PermissionsDetailsDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface TeamViewProps {
  teamMembers: TeamMember[]
  setTeamMembers: Dispatch<SetStateAction<TeamMember[]>>
  tasks: Task[]
  comments: Comment[]
  updateMemberApi: (id: string, data: Partial<TeamMember>) => Promise<{ success: boolean; data?: TeamMember; error?: string }>
  createMemberApi: (data: { name: string; email: string; role: TeamMember['role']; accessLevel: AccessLevel; password: string }) => Promise<{ success: boolean; data?: TeamMember; error?: string }>
  deleteMemberApi: (id: string) => Promise<{ success: boolean; error?: string }>
}

// Enhanced role config with icons and gradients
const roleConfig = {
  architect: {
    icon: Briefcase,
    gradient: 'from-purple-500 to-indigo-500',
    bgGradient: 'from-purple-500/10 to-indigo-500/10',
    textColor: 'text-purple-600 dark:text-purple-400',
    borderColor: 'border-purple-500/30'
  },
  developer: {
    icon: Code,
    gradient: 'from-blue-500 to-cyan-500',
    bgGradient: 'from-blue-500/10 to-cyan-500/10',
    textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-500/30'
  },
  devops: {
    icon: Gear,
    gradient: 'from-orange-500 to-amber-500',
    bgGradient: 'from-orange-500/10 to-amber-500/10',
    textColor: 'text-orange-600 dark:text-orange-400',
    borderColor: 'border-orange-500/30'
  },
  product: {
    icon: Package,
    gradient: 'from-green-500 to-emerald-500',
    bgGradient: 'from-green-500/10 to-emerald-500/10',
    textColor: 'text-green-600 dark:text-green-400',
    borderColor: 'border-green-500/30'
  }
}

// Access level config
const accessConfig = {
  owner: {
    icon: Crown,
    gradient: 'from-amber-500 to-orange-500',
    badgeClass: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0'
  },
  admin: {
    icon: ShieldCheck,
    gradient: 'from-purple-500 to-indigo-500',
    badgeClass: 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0'
  },
  member: {
    icon: UserCircle,
    gradient: 'from-green-500 to-emerald-500',
    badgeClass: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0'
  },
  viewer: {
    icon: Eye,
    gradient: 'from-slate-500 to-gray-500',
    badgeClass: 'bg-gradient-to-r from-slate-500 to-gray-500 text-white border-0'
  }
}

const TeamView = ({ teamMembers, setTeamMembers, tasks, comments, updateMemberApi, createMemberApi, deleteMemberApi }: TeamViewProps) => {
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterAccess, setFilterAccess] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'role' | 'tasks'>('name')

  const currentUser = teamMembers && teamMembers.length > 0 ? teamMembers[0] : mockTeamMembers[0]

  // Calculate stats for each member
  const memberStats = useMemo(() => {
    const stats: Record<string, { tasks: number; activeTasks: number; completedTasks: number; comments: number }> = {}
    teamMembers.forEach(member => {
      const memberTasks = tasks.filter(t => t.assigneeId === member.id)
      stats[member.id] = {
        tasks: memberTasks.length,
        activeTasks: memberTasks.filter(t => t.status !== 'done').length,
        completedTasks: memberTasks.filter(t => t.status === 'done').length,
        comments: comments.filter(c => c.authorId === member.id).length
      }
    })
    return stats
  }, [teamMembers, tasks, comments])

  // Filter and sort members
  const filteredMembers = useMemo(() => {
    return teamMembers
      .filter(member => {
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          if (!member.name.toLowerCase().includes(query) && 
              !member.email.toLowerCase().includes(query)) {
            return false
          }
        }
        if (filterRole !== 'all' && member.role !== filterRole) return false
        if (filterAccess !== 'all' && member.accessLevel !== filterAccess) return false
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name)
        if (sortBy === 'role') return a.role.localeCompare(b.role)
        if (sortBy === 'tasks') return (memberStats[b.id]?.activeTasks || 0) - (memberStats[a.id]?.activeTasks || 0)
        return 0
      })
  }, [teamMembers, searchQuery, filterRole, filterAccess, sortBy, memberStats])

  // Overall stats
  const overallStats = useMemo(() => ({
    total: teamMembers.length,
    online: teamMembers.filter(m => m.isOnline).length,
    byRole: {
      architect: teamMembers.filter(m => m.role === 'architect').length,
      developer: teamMembers.filter(m => m.role === 'developer').length,
      devops: teamMembers.filter(m => m.role === 'devops').length,
      product: teamMembers.filter(m => m.role === 'product').length
    },
    byAccess: {
      owner: teamMembers.filter(m => m.accessLevel === 'owner').length,
      admin: teamMembers.filter(m => m.accessLevel === 'admin').length,
      member: teamMembers.filter(m => m.accessLevel === 'member').length,
      viewer: teamMembers.filter(m => m.accessLevel === 'viewer').length
    }
  }), [teamMembers])

  if (!currentUser) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Unable to load team data</p>
        </CardContent>
      </Card>
    )
  }

  const handleDeleteMember = async (memberId: string) => {
    if (!canManageTeam(currentUser)) {
      toast.error('You do not have permission to delete team members')
      return
    }
    try {
      const result = await deleteMemberApi(memberId)
      if (result.success) {
        setTeamMembers(current => current.filter(m => m.id !== memberId))
        toast.success('Team member removed')
      } else {
        toast.error(result.error || 'Failed to delete team member')
      }
    } catch (error) {
      toast.error('Failed to delete team member')
    }
  }

  const handleToggleOnline = async (memberId: string) => {
    const member = teamMembers.find(m => m.id === memberId)
    if (!member) return
    
    try {
      const result = await updateMemberApi(memberId, { isOnline: !member.isOnline })
      if (result.success) {
        setTeamMembers(current =>
          current.map(m => m.id === memberId ? { ...m, isOnline: !m.isOnline } : m)
        )
      }
    } catch (error) {
      // Fallback to local update
      setTeamMembers(current =>
        current.map(m => m.id === memberId ? { ...m, isOnline: !m.isOnline } : m)
      )
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg">
              <Users size={26} weight="fill" className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Team Members</h3>
              <p className="text-sm text-muted-foreground">
                Manage your team, assign roles, and control access levels
              </p>
            </div>
          </div>
          <Dialog open={isAddingMember} onOpenChange={setIsAddingMember}>
            <DialogTrigger asChild>
              <Button 
                className="gap-2 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
                disabled={!canManageTeam(currentUser)}
              >
                <Plus size={18} weight="bold" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <AddEditMemberDialog
                onClose={() => setIsAddingMember(false)}
                onSave={async (member) => {
                  try {
                    const result = await createMemberApi({
                      name: member.name,
                      email: member.email,
                      role: member.role,
                      accessLevel: member.accessLevel,
                      password: 'tempPassword123'
                    })
                    if (result.success && result.data) {
                      setTeamMembers(current => [...current, result.data!])
                      setIsAddingMember(false)
                      toast.success('Team member added')
                    } else {
                      toast.error(result.error || 'Failed to add team member')
                    }
                  } catch (error) {
                    toast.error('Failed to add team member')
                  }
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Members</p>
                  <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{overallStats.total}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <Users size={20} className="text-violet-600" />
                </div>
              </div>
              <div className="flex -space-x-2 mt-3">
                {teamMembers.slice(0, 5).map(member => (
                  <Avatar key={member.id} className="h-6 w-6 border-2 border-background">
                    <AvatarImage src={member.avatarUrl} />
                    <AvatarFallback className="text-[10px]">{member.name[0]}</AvatarFallback>
                  </Avatar>
                ))}
                {teamMembers.length > 5 && (
                  <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium">
                    +{teamMembers.length - 5}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Online Now</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{overallStats.online}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Pulse size={20} className="text-green-600" />
                </div>
              </div>
              <div className="mt-3">
                <Progress value={(overallStats.online / overallStats.total) * 100} className="h-1.5 bg-green-500/20" />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {Math.round((overallStats.online / overallStats.total) * 100)}% active
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Developers</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{overallStats.byRole.developer}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Code size={20} className="text-blue-600" />
                </div>
              </div>
              <div className="flex gap-1 mt-3">
                {Object.entries(overallStats.byRole).map(([role, count]) => (
                  <Tooltip key={role}>
                    <TooltipTrigger asChild>
                      <div 
                        className={cn(
                          "h-1.5 rounded-full transition-all",
                          `bg-gradient-to-r ${roleConfig[role as keyof typeof roleConfig]?.gradient || 'from-gray-400 to-gray-500'}`
                        )}
                        style={{ width: `${(count / overallStats.total) * 100}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <span className="capitalize">{role}: {count}</span>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Admins</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {overallStats.byAccess.owner + overallStats.byAccess.admin}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <ShieldCheck size={20} className="text-amber-600" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 text-[10px]">
                <Badge variant="outline" className="h-5 px-1.5 gap-1 bg-amber-500/10 border-amber-500/30">
                  <Crown size={10} /> {overallStats.byAccess.owner} owner
                </Badge>
                <Badge variant="outline" className="h-5 px-1.5 gap-1 bg-purple-500/10 border-purple-500/30">
                  <ShieldCheck size={10} /> {overallStats.byAccess.admin} admin
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchQuery('')}
                  >
                    <X size={14} />
                  </Button>
                )}
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="architect">Architect</SelectItem>
                    <SelectItem value="developer">Developer</SelectItem>
                    <SelectItem value="devops">DevOps</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterAccess} onValueChange={setFilterAccess}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Access" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Access</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="role">Role</SelectItem>
                    <SelectItem value="tasks">Tasks</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Toggle */}
                <div className="flex items-center border rounded-lg p-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setViewMode('grid')}
                      >
                        <SquaresFour size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Grid view</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setViewMode('list')}
                      >
                        <ListBullets size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>List view</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>

            {/* Active Filters */}
            {(searchQuery || filterRole !== 'all' || filterAccess !== 'all') && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                <span className="text-xs text-muted-foreground">Filters:</span>
                {searchQuery && (
                  <Badge variant="secondary" className="gap-1 h-6">
                    Search: "{searchQuery}"
                    <X size={12} className="cursor-pointer hover:text-destructive" onClick={() => setSearchQuery('')} />
                  </Badge>
                )}
                {filterRole !== 'all' && (
                  <Badge variant="secondary" className="gap-1 h-6 capitalize">
                    {filterRole}
                    <X size={12} className="cursor-pointer hover:text-destructive" onClick={() => setFilterRole('all')} />
                  </Badge>
                )}
                {filterAccess !== 'all' && (
                  <Badge variant="secondary" className="gap-1 h-6 capitalize">
                    {filterAccess}
                    <X size={12} className="cursor-pointer hover:text-destructive" onClick={() => setFilterAccess('all')} />
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => {
                    setSearchQuery('')
                    setFilterRole('all')
                    setFilterAccess('all')
                  }}
                >
                  Clear all
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {filteredMembers.length} of {teamMembers.length} members
          </span>
        </div>

        {/* Team Members Grid/List */}
        {filteredMembers.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center mx-auto mb-4">
                <Users size={32} className="text-violet-500" />
              </div>
              <p className="font-medium text-lg mb-1">No members found</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map(member => {
              const stats = memberStats[member.id] || { tasks: 0, activeTasks: 0, completedTasks: 0, comments: 0 }
              const role = roleConfig[member.role]
              const access = accessConfig[member.accessLevel]
              const RoleIcon = role?.icon || Code
              const AccessIcon = access?.icon || UserCircle

              return (
                <Card 
                  key={member.id} 
                  className={cn(
                    "group relative overflow-hidden transition-all hover:shadow-lg",
                    member.isOnline && "ring-2 ring-green-500/20"
                  )}
                >
                  {/* Background Gradient */}
                  <div className={cn(
                    "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity",
                    `bg-gradient-to-br ${role?.bgGradient || 'from-gray-500/5 to-gray-500/10'}`
                  )} />
                  
                  <CardHeader className="relative pb-3">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="relative">
                        <Avatar className={cn(
                          "h-14 w-14 border-2 transition-all",
                          member.isOnline ? "border-green-500" : "border-transparent"
                        )}>
                          <AvatarImage src={member.avatarUrl} alt={member.name} />
                          <AvatarFallback className={cn(
                            "text-lg font-semibold bg-gradient-to-br",
                            role?.gradient || 'from-gray-400 to-gray-500',
                            "text-white"
                          )}>
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        {member.isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                            <div className="h-2 w-2 bg-white rounded-full animate-pulse" />
                          </div>
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base truncate">{member.name}</CardTitle>
                          <Tooltip>
                            <TooltipTrigger>
                              <AccessIcon size={16} weight="fill" className={access?.badgeClass?.includes('amber') ? 'text-amber-500' : access?.badgeClass?.includes('purple') ? 'text-purple-500' : 'text-muted-foreground'} />
                            </TooltipTrigger>
                            <TooltipContent className="capitalize">{member.accessLevel}</TooltipContent>
                          </Tooltip>
                        </div>
                        <CardDescription className="text-xs truncate flex items-center gap-1">
                          <EnvelopeSimple size={12} />
                          {member.email}
                        </CardDescription>
                      </div>
                      
                      {/* Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <DotsThree size={18} weight="bold" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setSelectedMember(member)}>
                            <ShieldCheck size={14} className="mr-2" />
                            View Permissions
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingMember(member)}>
                            <Sparkle size={14} className="mr-2" />
                            Edit Profile
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleOnline(member.id)}>
                            <Pulse size={14} className="mr-2" />
                            Toggle {member.isOnline ? 'Offline' : 'Online'}
                          </DropdownMenuItem>
                          {canManageTeam(currentUser) && member.accessLevel !== 'owner' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleDeleteMember(member.id)}
                              >
                                <X size={14} className="mr-2" />
                                Remove Member
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="relative space-y-3">
                    {/* Role & Access Badges */}
                    <div className="flex gap-2">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "flex-1 justify-center gap-1.5 capitalize",
                          role?.borderColor,
                          role?.textColor
                        )}
                      >
                        <RoleIcon size={12} />
                        {member.role}
                      </Badge>
                      <Badge className={cn("flex-1 justify-center gap-1.5 capitalize", access?.badgeClass)}>
                        <AccessIcon size={12} weight="fill" />
                        {member.accessLevel}
                      </Badge>
                    </div>
                    
                    <Separator />
                    
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-default">
                            <p className="text-lg font-bold">{stats.activeTasks}</p>
                            <p className="text-[10px] text-muted-foreground">Active</p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>Active tasks assigned</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-default">
                            <p className="text-lg font-bold text-green-600">{stats.completedTasks}</p>
                            <p className="text-[10px] text-muted-foreground">Done</p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>Completed tasks</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-default">
                            <p className="text-lg font-bold text-blue-600">{stats.comments}</p>
                            <p className="text-[10px] text-muted-foreground">Comments</p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>Comments posted</TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Progress */}
                    {stats.tasks > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Completion</span>
                          <span className="font-medium text-green-600">
                            {Math.round((stats.completedTasks / stats.tasks) * 100)}%
                          </span>
                        </div>
                        <Progress 
                          value={(stats.completedTasks / stats.tasks) * 100} 
                          className="h-1.5" 
                        />
                      </div>
                    )}

                    {/* Action Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                      onClick={() => setSelectedMember(member)}
                    >
                      <ShieldCheck size={14} />
                      View Permissions
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          /* List View */
          <Card>
            <ScrollArea className="h-[600px]">
              <div className="divide-y">
                {filteredMembers.map(member => {
                  const stats = memberStats[member.id] || { tasks: 0, activeTasks: 0, completedTasks: 0, comments: 0 }
                  const role = roleConfig[member.role]
                  const access = accessConfig[member.accessLevel]
                  const RoleIcon = role?.icon || Code
                  const AccessIcon = access?.icon || UserCircle

                  return (
                    <div 
                      key={member.id}
                      className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors group"
                    >
                      {/* Avatar */}
                      <div className="relative">
                        <Avatar className={cn(
                          "h-12 w-12 border-2",
                          member.isOnline ? "border-green-500" : "border-transparent"
                        )}>
                          <AvatarImage src={member.avatarUrl} alt={member.name} />
                          <AvatarFallback className={cn(
                            "font-semibold bg-gradient-to-br text-white",
                            role?.gradient
                          )}>
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        {member.isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-background" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">{member.name}</p>
                          <Badge className={cn("h-5 text-[10px] capitalize", access?.badgeClass)}>
                            {member.accessLevel}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                      </div>

                      {/* Role */}
                      <Badge 
                        variant="outline" 
                        className={cn("capitalize gap-1.5 hidden sm:flex", role?.borderColor, role?.textColor)}
                      >
                        <RoleIcon size={12} />
                        {member.role}
                      </Badge>

                      {/* Stats */}
                      <div className="hidden md:flex items-center gap-4 text-sm">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Clock size={14} />
                              <span className="font-medium">{stats.activeTasks}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Active tasks</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 text-green-600">
                              <CheckCircle size={14} weight="fill" />
                              <span className="font-medium">{stats.completedTasks}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Completed tasks</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 text-blue-600">
                              <ChatCircleDots size={14} weight="fill" />
                              <span className="font-medium">{stats.comments}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Comments</TooltipContent>
                        </Tooltip>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 hidden sm:flex"
                          onClick={() => setSelectedMember(member)}
                        >
                          <ShieldCheck size={14} />
                          Permissions
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <DotsThree size={18} weight="bold" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => setSelectedMember(member)}>
                              <ShieldCheck size={14} className="mr-2" />
                              View Permissions
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingMember(member)}>
                              <Sparkle size={14} className="mr-2" />
                              Edit Profile
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleOnline(member.id)}>
                              <Pulse size={14} className="mr-2" />
                              Toggle {member.isOnline ? 'Offline' : 'Online'}
                            </DropdownMenuItem>
                            {canManageTeam(currentUser) && member.accessLevel !== 'owner' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => handleDeleteMember(member.id)}
                                >
                                  <X size={14} className="mr-2" />
                                  Remove Member
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </Card>
        )}

        {/* Edit Member Dialog */}
        <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
          <DialogContent className="max-w-xl">
            {editingMember && (
              <AddEditMemberDialog
                member={editingMember}
                onClose={() => setEditingMember(null)}
                onSave={async (updatedMember) => {
                  try {
                    const result = await updateMemberApi(editingMember.id, {
                      name: updatedMember.name,
                      email: updatedMember.email,
                      role: updatedMember.role,
                      accessLevel: updatedMember.accessLevel,
                      customPermissions: updatedMember.customPermissions,
                      avatarUrl: updatedMember.avatarUrl,
                      isOnline: updatedMember.isOnline
                    })
                    if (result.success && result.data) {
                      setTeamMembers(current =>
                        current.map(m => m.id === editingMember.id ? result.data! : m)
                      )
                      setEditingMember(null)
                      toast.success('Team member updated')
                    } else {
                      toast.error(result.error || 'Failed to update team member')
                    }
                  } catch (error) {
                    toast.error('Failed to update team member')
                  }
                }}
                onDelete={() => {
                  handleDeleteMember(editingMember.id)
                  setEditingMember(null)
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Permissions Dialog */}
        <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
          <DialogContent className="max-w-2xl">
            {selectedMember && (
              <Suspense fallback={
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              }>
                <PermissionsDetailsDialog
                  member={selectedMember}
                  onClose={() => setSelectedMember(null)}
                  onSave={async (updatedMember) => {
                    try {
                      const result = await updateMemberApi(selectedMember.id, {
                        accessLevel: updatedMember.accessLevel,
                        customPermissions: updatedMember.customPermissions
                      })
                      if (result.success && result.data) {
                        setTeamMembers(current =>
                          current.map(m => m.id === updatedMember.id ? result.data! : m)
                        )
                        setSelectedMember(null)
                      } else {
                        toast.error(result.error || 'Failed to update permissions')
                      }
                    } catch (error) {
                      toast.error('Failed to update permissions')
                    }
                  }}
                  canEdit={canManageTeam(currentUser)}
                />
              </Suspense>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}

export default TeamView

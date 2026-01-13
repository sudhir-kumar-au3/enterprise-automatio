import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Users, 
  Plus, 
  CheckCircle,
  Circle,
  Tag,
  ShieldCheck,
  Lock
} from '@phosphor-icons/react'
import { TeamMember, AccessLevel, Permission, ACCESS_LEVEL_PERMISSIONS } from '@/lib/collaboration-data'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { 
  accessLevelIcons, 
  accessLevelDescriptions, 
  roleDescriptions, 
  allPermissions 
} from './constants'

export interface AddEditMemberDialogProps {
  member?: TeamMember
  onClose: () => void
  onSave: (member: TeamMember) => void
  onDelete?: () => void
}

const AddEditMemberDialog = ({ member, onClose, onSave, onDelete }: AddEditMemberDialogProps) => {
  const [name, setName] = useState(member?.name || '')
  const [email, setEmail] = useState(member?.email || '')
  const [role, setRole] = useState<TeamMember['role']>(member?.role || 'developer')
  const [accessLevel, setAccessLevel] = useState<AccessLevel>(member?.accessLevel || 'member')
  const [avatarUrl, setAvatarUrl] = useState(member?.avatarUrl || '')
  const [isOnline, setIsOnline] = useState(member?.isOnline ?? true)
  const [customPermissions, setCustomPermissions] = useState<Permission[]>(member?.customPermissions || [])
  const [showCustomPermissions, setShowCustomPermissions] = useState(false)

  const handleRoleChange = (newRole: TeamMember['role']) => {
    setRole(newRole)
    const suggested = roleDescriptions[newRole].suggestedAccess
    if (accessLevel !== 'owner') {
      setAccessLevel(suggested)
      toast.info(`Suggested access level "${suggested}" for ${newRole} role`)
    }
  }

  const toggleCustomPermission = (permission: Permission) => {
    setCustomPermissions(current => {
      if (current.includes(permission)) {
        return current.filter(p => p !== permission)
      } else {
        return [...current, permission]
      }
    })
  }

  const basePermissions = ACCESS_LEVEL_PERMISSIONS[accessLevel] || []

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Please enter a name')
      return
    }

    if (!email.trim()) {
      toast.error('Please enter an email')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email')
      return
    }

    const effectiveCustomPermissions = customPermissions.filter(p => !basePermissions.includes(p))

    const memberData: TeamMember = {
      id: member?.id || `user-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      role,
      accessLevel,
      customPermissions: effectiveCustomPermissions.length > 0 ? effectiveCustomPermissions : undefined,
      avatarUrl: avatarUrl.trim() || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      isOnline
    }

    onSave(memberData)
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete()
    }
  }

  const currentPermissions = ACCESS_LEVEL_PERMISSIONS[accessLevel]
  const totalPermissions = new Set([...basePermissions, ...customPermissions]).size

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {member ? (
            <>
              <Avatar className="h-8 w-8">
                <AvatarImage src={member.avatarUrl} alt={member.name} />
                <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              Edit {member.name}
            </>
          ) : (
            <>
              <Users size={24} weight="duotone" />
              Add Team Member
            </>
          )}
        </DialogTitle>
        <DialogDescription>
          {member ? 'Update team member information, role, and permissions' : 'Add a new member to your team with specific access levels'}
        </DialogDescription>
      </DialogHeader>

      <ScrollArea className="max-h-[60vh]">
        <div className="space-y-5 mt-4 pr-4">
          {/* Basic Info Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <Users size={14} />
              Basic Information
            </h4>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="member-name">Name *</Label>
                <Input
                  id="member-name"
                  placeholder="e.g., John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="member-email">Email *</Label>
                <Input
                  id="member-email"
                  type="email"
                  placeholder="e.g., john.doe@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-avatar">Avatar URL (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="member-avatar"
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="flex-1"
                />
                {(avatarUrl || name) && (
                  <Avatar className="h-10 w-10 border">
                    <AvatarImage src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'user')}`} />
                    <AvatarFallback>{name.split(' ').map(n => n[0]).join('') || 'U'}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Role Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <Tag size={14} />
              Role & Responsibilities
            </h4>
            
            <div className="grid sm:grid-cols-2 gap-3">
              {(Object.entries(roleDescriptions) as [TeamMember['role'], typeof roleDescriptions['architect']][]).map(([roleKey, roleInfo]) => (
                <Card
                  key={roleKey}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    role === roleKey ? "border-primary border-2 bg-primary/5" : "hover:border-muted-foreground/30"
                  )}
                  onClick={() => handleRoleChange(roleKey)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-xl">{roleInfo.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm capitalize">{roleKey}</p>
                          {role === roleKey && (
                            <CheckCircle size={14} weight="fill" className="text-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{roleInfo.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* Access Level Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <ShieldCheck size={14} />
              Access Level
            </h4>
            
            <div className="space-y-2">
              {(Object.entries(accessLevelDescriptions) as [AccessLevel, typeof accessLevelDescriptions['owner']][]).map(([level, info]) => (
                <Card
                  key={level}
                  className={cn(
                    "cursor-pointer transition-all",
                    accessLevel === level ? `border-2 ${info.color}` : "hover:border-muted-foreground/30"
                  )}
                  onClick={() => setAccessLevel(level)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{accessLevelIcons[level]}</span>
                        <div>
                          <p className="font-medium text-sm capitalize">{level}</p>
                          <p className="text-xs text-muted-foreground">{info.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {(ACCESS_LEVEL_PERMISSIONS[level] || []).length} permissions
                        </Badge>
                        {accessLevel === level && (
                          <CheckCircle size={18} weight="fill" className="text-primary" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* Permissions Preview & Custom Permissions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                <Lock size={14} />
                Permissions ({totalPermissions} total)
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCustomPermissions(!showCustomPermissions)}
                className="gap-2"
              >
                {showCustomPermissions ? 'Hide' : 'Customize'}
                <Badge variant="secondary" className="text-xs">
                  {customPermissions.filter(p => !basePermissions.includes(p)).length} custom
                </Badge>
              </Button>
            </div>

            {/* Base Permissions Preview */}
            <div className="border rounded-lg p-3 bg-muted/30">
              <p className="text-xs font-medium mb-2 text-muted-foreground">
                Base permissions for {accessLevel} access:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(currentPermissions || []).filter(p => p).map((permission, idx) => (
                  <Badge key={`${permission}-${idx}`} variant="secondary" className="text-xs gap-1">
                    <CheckCircle size={10} weight="fill" className="text-green-600" />
                    {permission.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Custom Permissions Toggle */}
            {showCustomPermissions && (
              <Card className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Add Custom Permissions</CardTitle>
                  <CardDescription className="text-xs">
                    Grant additional permissions beyond the base access level
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {allPermissions.map((permission, idx) => {
                      const isBasePermission = basePermissions.includes(permission)
                      const isCustomEnabled = customPermissions.includes(permission)
                      const isEnabled = isBasePermission || isCustomEnabled

                      return (
                        <div
                          key={`${permission}-${idx}`}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-md border transition-colors",
                            isBasePermission ? "bg-green-50 border-green-200 dark:bg-green-950/20" : 
                            isCustomEnabled ? "bg-blue-50 border-blue-200 dark:bg-blue-950/20" : 
                            "bg-muted/30 hover:bg-muted/50"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {isEnabled ? (
                              <CheckCircle size={14} weight="fill" className={isBasePermission ? "text-green-600" : "text-blue-600"} />
                            ) : (
                              <Circle size={14} className="text-muted-foreground" />
                            )}
                            <span className={cn(
                              "text-xs",
                              isEnabled ? "text-foreground" : "text-muted-foreground"
                            )}>
                              {permission.replace(/_/g, ' ')}
                            </span>
                          </div>
                          {isBasePermission ? (
                            <Badge variant="outline" className="text-xs">Base</Badge>
                          ) : (
                            <Switch
                              checked={isCustomEnabled}
                              onCheckedChange={() => toggleCustomPermission(permission)}
                              className="scale-75"
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Custom Permissions Summary */}
            {customPermissions.filter(p => !basePermissions.includes(p)).length > 0 && (
              <div className="border rounded-lg p-3 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200">
                <p className="text-xs font-medium mb-2 text-blue-700 dark:text-blue-400">
                  Custom permissions added:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {customPermissions.filter(p => !basePermissions.includes(p)).map((permission, idx) => (
                    <Badge key={`custom-${permission}-${idx}`} className="text-xs gap-1 bg-blue-100 text-blue-800 hover:bg-blue-200">
                      <Plus size={10} weight="bold" />
                      {permission.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Status Section */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-3 w-3 rounded-full",
                isOnline ? "bg-green-500" : "bg-gray-400"
              )} />
              <div>
                <p className="text-sm font-medium">Availability Status</p>
                <p className="text-xs text-muted-foreground">
                  {isOnline ? 'Member is available and online' : 'Member is currently offline'}
                </p>
              </div>
            </div>
            <Switch
              id="member-online"
              checked={isOnline}
              onCheckedChange={setIsOnline}
            />
          </div>
        </div>
      </ScrollArea>

      <div className="flex gap-2 justify-between pt-4 border-t mt-4">
        {member && onDelete && (
          <Button variant="destructive" onClick={handleDelete} className="gap-2">
            <Circle size={14} weight="fill" className="text-red-200" />
            Delete Member
          </Button>
        )}
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <CheckCircle size={16} weight="bold" />
            {member ? 'Update' : 'Add'} Member
          </Button>
        </div>
      </div>
    </>
  )
}

export default AddEditMemberDialog

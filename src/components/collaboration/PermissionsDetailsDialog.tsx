import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle,
  Clock,
  Tag,
  Circle,
  ShieldCheck,
  Lock,
  Plus,
  Crown,
  UserCircle,
  Eye,
  Sparkle,
  Warning,
  CaretRight,
  X,
  PencilSimple,
  FloppyDisk,
  Info
} from '@phosphor-icons/react'
import { TeamMember, AccessLevel, ACCESS_LEVEL_PERMISSIONS, Permission } from '@/lib/collaboration-data'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { 
  accessLevelColors, 
  accessLevelIcons, 
  allPermissions, 
  permissionDescriptions, 
  permissionCategories,
  accessLevelDescriptions 
} from './constants'

export interface PermissionsDetailsDialogProps {
  member: TeamMember
  onClose: () => void
  onSave?: (updatedMember: TeamMember) => void
  canEdit?: boolean
}

// Enhanced access level config with gradients and icons
const accessLevelConfig = {
  owner: {
    icon: Crown,
    gradient: 'from-amber-500 to-orange-500',
    bgGradient: 'from-amber-500/10 to-orange-500/10',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-600 dark:text-amber-400',
    badgeClass: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
    description: 'Full system access with all permissions. Can manage everything.'
  },
  admin: {
    icon: ShieldCheck,
    gradient: 'from-purple-500 to-indigo-500',
    bgGradient: 'from-purple-500/10 to-indigo-500/10',
    borderColor: 'border-purple-500/30',
    textColor: 'text-purple-600 dark:text-purple-400',
    badgeClass: 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white',
    description: 'Administrative access to manage team and content.'
  },
  member: {
    icon: UserCircle,
    gradient: 'from-green-500 to-emerald-500',
    bgGradient: 'from-green-500/10 to-emerald-500/10',
    borderColor: 'border-green-500/30',
    textColor: 'text-green-600 dark:text-green-400',
    badgeClass: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
    description: 'Standard team member access. Can create tasks, collaborate, and view analytics.'
  },
  viewer: {
    icon: Eye,
    gradient: 'from-slate-500 to-gray-500',
    bgGradient: 'from-slate-500/10 to-gray-500/10',
    borderColor: 'border-slate-500/30',
    textColor: 'text-slate-600 dark:text-slate-400',
    badgeClass: 'bg-gradient-to-r from-slate-500 to-gray-500 text-white',
    description: 'Read-only access with ability to comment.'
  }
}

// Category icons
const categoryIcons = {
  'Team Management': Lock,
  'Task Management': CheckCircle,
  'Content Management': Tag,
  'Analytics & Reports': Sparkle,
  'System Settings': ShieldCheck
}

const PermissionsDetailsDialog = ({ member, onClose, onSave, canEdit = false }: PermissionsDetailsDialogProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [accessLevel, setAccessLevel] = useState<AccessLevel>(member.accessLevel)
  const [customPermissions, setCustomPermissions] = useState<Permission[]>(member.customPermissions || [])
  const [hasChanges, setHasChanges] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<string[]>(Object.keys(permissionCategories))

  const basePermissions = ACCESS_LEVEL_PERMISSIONS[accessLevel] || []
  const config = accessLevelConfig[accessLevel]
  const AccessIcon = config.icon

  const toggleCustomPermission = (permission: Permission) => {
    setCustomPermissions(current => {
      const newPermissions = current.includes(permission)
        ? current.filter(p => p !== permission)
        : [...current, permission]
      return newPermissions
    })
    setHasChanges(true)
  }

  const handleAccessLevelChange = (newLevel: AccessLevel) => {
    setAccessLevel(newLevel)
    const newBasePermissions = ACCESS_LEVEL_PERMISSIONS[newLevel] || []
    setCustomPermissions(current => current.filter(p => !newBasePermissions.includes(p)))
    setHasChanges(true)
  }

  const handleSave = () => {
    if (onSave) {
      const effectiveCustomPermissions = customPermissions.filter(p => !basePermissions.includes(p))
      const updatedMember: TeamMember = {
        ...member,
        accessLevel,
        customPermissions: effectiveCustomPermissions.length > 0 ? effectiveCustomPermissions : undefined
      }
      onSave(updatedMember)
      toast.success('Permissions updated successfully')
    }
    setIsEditing(false)
    setHasChanges(false)
  }

  const handleCancel = () => {
    setAccessLevel(member.accessLevel)
    setCustomPermissions(member.customPermissions || [])
    setIsEditing(false)
    setHasChanges(false)
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories(current =>
      current.includes(category)
        ? current.filter(c => c !== category)
        : [...current, category]
    )
  }

  const totalPermissions = new Set([...basePermissions, ...customPermissions]).size
  const maxPermissions = allPermissions.length
  const permissionPercentage = Math.round((totalPermissions / maxPermissions) * 100)

  return (
    <>
      {/* Enhanced Header */}
      <DialogHeader className="pb-0">
        <div className="flex items-start gap-4">
          <div className={cn(
            "h-12 w-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg",
            config.gradient
          )}>
            <ShieldCheck size={24} weight="fill" className="text-white" />
          </div>
          <div className="flex-1">
            <DialogTitle className="text-xl font-bold">
              Permissions for {member.name}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 mt-1">
              <span className="text-muted-foreground">Access level:</span>
              <Badge className={cn('capitalize gap-1.5 font-medium', config.badgeClass)}>
                <AccessIcon size={12} weight="fill" />
                {accessLevel}
              </Badge>
              <span className="text-xs text-muted-foreground">({totalPermissions} permissions)</span>
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <ScrollArea className="max-h-[60vh] mt-4 -mx-6 px-6">
        <div className="space-y-4">
          {/* Access Level Card - Always Visible */}
          <div className={cn(
            "relative overflow-hidden rounded-xl border-2 p-4 transition-all",
            config.borderColor,
            `bg-gradient-to-br ${config.bgGradient}`
          )}>
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative flex items-start gap-4">
              <div className={cn(
                "h-14 w-14 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg flex-shrink-0",
                config.gradient
              )}>
                <AccessIcon size={28} weight="fill" className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle size={18} weight="fill" className={config.textColor} />
                  <h3 className={cn("font-bold text-lg capitalize", config.textColor)}>
                    {accessLevel} Access Level
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {config.description}
                </p>
                
                {/* Permission Progress */}
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Permissions enabled</span>
                    <span className={cn("font-semibold", config.textColor)}>
                      {totalPermissions}/{maxPermissions}
                    </span>
                  </div>
                  <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-500 bg-gradient-to-r", config.gradient)}
                      style={{ width: `${permissionPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Mode Toggle */}
          {canEdit && onSave && (
            <div className={cn(
              "flex items-center justify-between p-3 rounded-lg border transition-all",
              isEditing 
                ? "bg-primary/5 border-primary/30" 
                : "bg-muted/30 border-transparent hover:border-muted-foreground/20"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center",
                  isEditing ? "bg-primary/10" : "bg-muted"
                )}>
                  {isEditing ? (
                    <PencilSimple size={16} className="text-primary" />
                  ) : (
                    <Lock size={16} className="text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {isEditing ? 'Edit Mode' : 'View Mode'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isEditing ? 'Modify permissions and access level' : 'Click to edit permissions'}
                  </p>
                </div>
              </div>
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-2 h-9"
                >
                  <PencilSimple size={14} />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCancel} className="h-9">
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSave}
                    disabled={!hasChanges}
                    className="gap-2 h-9"
                  >
                    <FloppyDisk size={14} weight="bold" />
                    Save
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Access Level Selection (Edit Mode) */}
          {isEditing && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary" />
                <h4 className="font-semibold text-sm">Change Access Level</h4>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(accessLevelConfig) as [AccessLevel, typeof accessLevelConfig['owner']][]).map(([level, levelConfig]) => {
                  const LevelIcon = levelConfig.icon
                  const isSelected = accessLevel === level
                  
                  return (
                    <button
                      key={level}
                      onClick={() => handleAccessLevelChange(level)}
                      className={cn(
                        "relative p-3 rounded-xl border-2 text-left transition-all hover:shadow-md",
                        isSelected 
                          ? `${levelConfig.borderColor} bg-gradient-to-br ${levelConfig.bgGradient}` 
                          : "border-transparent bg-muted/30 hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "h-9 w-9 rounded-lg flex items-center justify-center",
                          isSelected 
                            ? `bg-gradient-to-br ${levelConfig.gradient}` 
                            : "bg-muted"
                        )}>
                          <LevelIcon 
                            size={18} 
                            weight={isSelected ? "fill" : "regular"}
                            className={isSelected ? "text-white" : "text-muted-foreground"} 
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className={cn(
                              "font-semibold text-sm capitalize",
                              isSelected && levelConfig.textColor
                            )}>
                              {level}
                            </p>
                            {isSelected && (
                              <CheckCircle size={14} weight="fill" className={levelConfig.textColor} />
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {levelConfig.description.split('.')[0]}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Permission Categories */}
          <div className="space-y-2">
            {Object.entries(permissionCategories).map(([category, permissions]) => {
              const CategoryIcon = categoryIcons[category as keyof typeof categoryIcons] || Lock
              const isExpanded = expandedCategories.includes(category)
              const categoryBaseCount = permissions.filter(p => basePermissions.includes(p)).length
              const categoryCustomCount = permissions.filter(p => customPermissions.includes(p) && !basePermissions.includes(p)).length
              const categoryTotal = categoryBaseCount + categoryCustomCount
              
              return (
                <div key={category} className="rounded-xl border overflow-hidden">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center">
                        <CategoryIcon size={16} className="text-muted-foreground" />
                      </div>
                      <span className="font-semibold text-sm">{category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs h-5 px-2">
                        {categoryTotal}/{permissions.length}
                      </Badge>
                      <CaretRight 
                        size={16} 
                        className={cn(
                          "text-muted-foreground transition-transform",
                          isExpanded && "rotate-90"
                        )}
                      />
                    </div>
                  </button>
                  
                  {/* Permissions List */}
                  {isExpanded && (
                    <div className="divide-y">
                      {permissions.map((permission, idx) => {
                        const isBasePermission = basePermissions.includes(permission)
                        const isCustomEnabled = customPermissions.includes(permission)
                        const hasAccess = isBasePermission || isCustomEnabled

                        return (
                          <div 
                            key={`${permission}-${idx}`}
                            className={cn(
                              "flex items-center gap-3 p-3 transition-all",
                              hasAccess 
                                ? isBasePermission 
                                  ? "bg-green-500/5" 
                                  : "bg-blue-500/5"
                                : "bg-background",
                              isEditing && !isBasePermission && "cursor-pointer hover:bg-muted/50"
                            )}
                            onClick={() => {
                              if (isEditing && !isBasePermission) {
                                toggleCustomPermission(permission)
                              }
                            }}
                          >
                            {/* Status Icon */}
                            <div className={cn(
                              "h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0",
                              hasAccess 
                                ? isBasePermission 
                                  ? "bg-green-500/10" 
                                  : "bg-blue-500/10"
                                : "bg-muted"
                            )}>
                              {hasAccess ? (
                                <CheckCircle 
                                  size={16} 
                                  weight="fill" 
                                  className={isBasePermission ? "text-green-600" : "text-blue-600"} 
                                />
                              ) : (
                                <Circle size={16} className="text-muted-foreground/50" />
                              )}
                            </div>
                            
                            {/* Permission Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={cn(
                                  "text-sm font-medium",
                                  hasAccess 
                                    ? isBasePermission 
                                      ? "text-green-700 dark:text-green-400" 
                                      : "text-blue-700 dark:text-blue-400"
                                    : "text-muted-foreground"
                                )}>
                                  {permission.replace(/_/g, ' ')}
                                </p>
                                {isBasePermission && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400">
                                    Base
                                  </Badge>
                                )}
                                {isCustomEnabled && !isBasePermission && (
                                  <Badge className="text-[10px] h-4 px-1.5 bg-blue-500 text-white">
                                    Custom
                                  </Badge>
                                )}
                              </div>
                              <p className={cn(
                                "text-xs mt-0.5",
                                hasAccess ? "text-muted-foreground" : "text-muted-foreground/60"
                              )}>
                                {permissionDescriptions[permission]}
                              </p>
                            </div>
                            
                            {/* Toggle Switch (Edit Mode) */}
                            {isEditing && !isBasePermission && (
                              <Switch
                                checked={isCustomEnabled}
                                onCheckedChange={() => toggleCustomPermission(permission)}
                                onClick={(e) => e.stopPropagation()}
                                className="data-[state=checked]:bg-blue-500"
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Custom Permissions Summary */}
          {customPermissions.filter(p => !basePermissions.includes(p)).length > 0 && (
            <div className="rounded-xl border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                  <Sparkle size={16} weight="fill" className="text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-blue-700 dark:text-blue-400">
                    Custom Permissions
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {customPermissions.filter(p => !basePermissions.includes(p)).length} additional permissions granted
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {customPermissions.filter(p => !basePermissions.includes(p)).map((permission, idx) => (
                  <Badge 
                    key={`${permission}-${idx}`} 
                    className="text-xs gap-1.5 bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30 hover:bg-blue-500/20 transition-colors"
                  >
                    <Plus size={10} weight="bold" />
                    {permission.replace(/_/g, ' ')}
                    {isEditing && (
                      <button
                        onClick={() => toggleCustomPermission(permission)}
                        className="ml-0.5 hover:text-red-500 transition-colors"
                      >
                        <X size={12} weight="bold" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Changes Indicator */}
          {hasChanges && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Warning size={16} className="text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  Unsaved changes
                </p>
                <p className="text-xs text-muted-foreground">
                  Click Save to apply your changes
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <Separator className="my-4" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info size={14} />
          <span>Base permissions are determined by access level</span>
        </div>
        <div className="flex gap-2">
          {isEditing && hasChanges ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="gap-2">
                <FloppyDisk size={16} weight="bold" />
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={onClose} className="bg-primary hover:bg-primary/90">
              Close
            </Button>
          )}
        </div>
      </div>
    </>
  )
}

export default PermissionsDetailsDialog

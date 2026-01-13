import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Settings,
  Bell,
  BellRing,
  Moon,
  Sun,
  Palette,
  Keyboard,
  Shield,
  Mail,
  Volume2,
  Clock,
  Eye,
  Save,
  RotateCcw,
  CheckCircle2,
  Zap,
  Monitor,
  Laptop,
  User,
  Database,
  Download,
  Trash2,
  Loader2,
  Check
} from 'lucide-react';
import { useAuth, useSettings } from '@/contexts';
import type { AppearanceSettings, ProductivitySettings, PrivacySettings } from '@/contexts';

// Accent colors with proper styling
const accentColors = [
  { name: 'Blue', value: 'blue', bg: 'bg-blue-500', ring: 'ring-blue-500' },
  { name: 'Purple', value: 'purple', bg: 'bg-purple-500', ring: 'ring-purple-500' },
  { name: 'Green', value: 'green', bg: 'bg-green-500', ring: 'ring-green-500' },
  { name: 'Orange', value: 'orange', bg: 'bg-orange-500', ring: 'ring-orange-500' },
  { name: 'Pink', value: 'pink', bg: 'bg-pink-500', ring: 'ring-pink-500' },
  { name: 'Teal', value: 'teal', bg: 'bg-teal-500', ring: 'ring-teal-500' },
] as const;

// Navigation items
const navItems = [
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'productivity', label: 'Productivity', icon: Zap },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
  { id: 'account', label: 'Account', icon: User },
];

// Keyboard shortcuts data
const shortcutsData = [
  { 
    category: 'General', 
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Open command palette' },
      { keys: ['⌘', '/'], description: 'Show keyboard shortcuts' },
      { keys: ['⌘', 'S'], description: 'Save changes' },
      { keys: ['Esc'], description: 'Close dialog' },
    ]
  },
  { 
    category: 'Navigation', 
    shortcuts: [
      { keys: ['G', 'H'], description: 'Go to home' },
      { keys: ['G', 'T'], description: 'Go to tasks' },
      { keys: ['G', 'C'], description: 'Go to calendar' },
      { keys: ['G', 'A'], description: 'Go to analytics' },
    ]
  },
  { 
    category: 'Tasks', 
    shortcuts: [
      { keys: ['N'], description: 'New task' },
      { keys: ['E'], description: 'Edit task' },
      { keys: ['D'], description: 'Delete task' },
      { keys: ['Space'], description: 'Toggle task status' },
    ]
  },
];

interface SettingsDialogProps {
  trigger?: React.ReactNode;
}

export function SettingsDialog({ trigger }: SettingsDialogProps) {
  const { user } = useAuth();
  const { 
    settings, 
    updateNotifications, 
    updateAppearance, 
    updateProductivity, 
    updatePrivacy,
    resetSettings,
    saveSettings,
    isSaving 
  } = useSettings();
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('notifications');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [initialSettings, setInitialSettings] = useState(JSON.stringify(settings));

  // Track if there are unsaved changes
  const hasChanges = JSON.stringify(settings) !== initialSettings;

  // Update initial settings when dialog opens
  useEffect(() => {
    if (isOpen) {
      setInitialSettings(JSON.stringify(settings));
      setSaveSuccess(false);
    }
  }, [isOpen]);

  // Handle save
  const handleSave = async () => {
    try {
      await saveSettings();
      setInitialSettings(JSON.stringify(settings));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };

  // Handle reset
  const handleReset = () => {
    resetSettings();
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        updateNotifications('desktop', true);
      }
    }
  };

  // Get user initials
  const userInitials = user?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Settings className="h-[1.2rem] w-[1.2rem]" />
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-background flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Customize your experience and preferences
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Sidebar Navigation */}
          <nav className="w-44 flex-shrink-0 border-r bg-muted/40 p-3 overflow-y-auto">
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              
              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <>
                  <div>
                    <h3 className="text-lg font-semibold">Notifications</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure how and when you receive notifications
                    </p>
                  </div>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BellRing className="h-4 w-4" />
                        General Notifications
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Enable notifications</Label>
                          <p className="text-xs text-muted-foreground">
                            Receive notifications about important updates
                          </p>
                        </div>
                        <Switch
                          checked={settings.notifications.enabled}
                          onCheckedChange={(v) => updateNotifications('enabled', v)}
                        />
                      </div>
                      
                      <Separator />
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium flex items-center gap-2">
                            <Volume2 className="h-3.5 w-3.5" />
                            Sound alerts
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Play a sound for new notifications
                          </p>
                        </div>
                        <Switch
                          checked={settings.notifications.sound}
                          onCheckedChange={(v) => updateNotifications('sound', v)}
                          disabled={!settings.notifications.enabled}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium flex items-center gap-2">
                            <Monitor className="h-3.5 w-3.5" />
                            Desktop notifications
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Show browser push notifications
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {'Notification' in window && Notification.permission !== 'granted' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={requestNotificationPermission}
                              className="h-7 text-xs"
                            >
                              Allow
                            </Button>
                          )}
                          <Switch
                            checked={settings.notifications.desktop}
                            onCheckedChange={(v) => updateNotifications('desktop', v)}
                            disabled={!settings.notifications.enabled}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Notifications
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Email notifications</Label>
                          <p className="text-xs text-muted-foreground">
                            Receive notifications via email
                          </p>
                        </div>
                        <Switch
                          checked={settings.notifications.email}
                          onCheckedChange={(v) => updateNotifications('email', v)}
                          disabled={!settings.notifications.enabled}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Weekly digest</Label>
                          <p className="text-xs text-muted-foreground">
                            Get a weekly summary of your tasks
                          </p>
                        </div>
                        <Switch
                          checked={settings.notifications.weeklyDigest}
                          onCheckedChange={(v) => updateNotifications('weeklyDigest', v)}
                          disabled={!settings.notifications.email}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Notification Types
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Task assigned to me</Label>
                        <Switch
                          checked={settings.notifications.taskAssigned}
                          onCheckedChange={(v) => updateNotifications('taskAssigned', v)}
                          disabled={!settings.notifications.enabled}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Task completed</Label>
                        <Switch
                          checked={settings.notifications.taskCompleted}
                          onCheckedChange={(v) => updateNotifications('taskCompleted', v)}
                          disabled={!settings.notifications.enabled}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Mentions (@me)</Label>
                        <Switch
                          checked={settings.notifications.mentions}
                          onCheckedChange={(v) => updateNotifications('mentions', v)}
                          disabled={!settings.notifications.enabled}
                        />
                      </div>
                      
                      <Separator />
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5" />
                            Deadline reminders
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Get reminded before task deadlines
                          </p>
                        </div>
                        <Switch
                          checked={settings.notifications.deadlineReminders}
                          onCheckedChange={(v) => updateNotifications('deadlineReminders', v)}
                          disabled={!settings.notifications.enabled}
                        />
                      </div>
                      
                      {settings.notifications.deadlineReminders && (
                        <div className="ml-6 space-y-2">
                          <Label className="text-xs text-muted-foreground">Remind me</Label>
                          <Select
                            value={String(settings.notifications.deadlineReminderDays)}
                            onValueChange={(v) => updateNotifications('deadlineReminderDays', parseInt(v))}
                          >
                            <SelectTrigger className="w-44 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 day before</SelectItem>
                              <SelectItem value="2">2 days before</SelectItem>
                              <SelectItem value="3">3 days before</SelectItem>
                              <SelectItem value="7">1 week before</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Appearance Tab */}
              {activeTab === 'appearance' && (
                <>
                  <div>
                    <h3 className="text-lg font-semibold">Appearance</h3>
                    <p className="text-sm text-muted-foreground">
                      Customize the look and feel of the application
                    </p>
                  </div>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        Theme
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: 'light', label: 'Light', icon: Sun },
                          { value: 'dark', label: 'Dark', icon: Moon },
                          { value: 'system', label: 'System', icon: Laptop },
                        ].map((theme) => {
                          const Icon = theme.icon;
                          const isSelected = settings.appearance.theme === theme.value;
                          return (
                            <button
                              key={theme.value}
                              type="button"
                              onClick={() => updateAppearance('theme', theme.value as AppearanceSettings['theme'])}
                              className={cn(
                                "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all cursor-pointer",
                                isSelected
                                  ? "border-primary bg-primary/10"
                                  : "border-muted bg-muted/30 hover:bg-muted/50 hover:border-muted-foreground/30"
                              )}
                            >
                              <Icon className={cn("h-6 w-6", isSelected ? "text-primary" : "text-muted-foreground")} />
                              <span className={cn("text-sm font-medium", isSelected ? "text-primary" : "text-muted-foreground")}>
                                {theme.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Accent Color
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-3">
                        {accentColors.map((color) => {
                          const isSelected = settings.appearance.accentColor === color.value;
                          return (
                            <button
                              key={color.value}
                              type="button"
                              onClick={() => updateAppearance('accentColor', color.value)}
                              className={cn(
                                "h-10 w-10 rounded-full transition-all cursor-pointer flex items-center justify-center",
                                color.bg,
                                isSelected && "ring-2 ring-offset-2 ring-offset-background",
                                isSelected && color.ring,
                                !isSelected && "hover:scale-110 hover:ring-2 hover:ring-offset-2 hover:ring-offset-background hover:ring-muted-foreground/50"
                              )}
                              title={color.name}
                            >
                              {isSelected && (
                                <Check className="h-5 w-5 text-white" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        Selected: <span className="font-medium capitalize">{settings.appearance.accentColor}</span>
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Display Options</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Compact mode</Label>
                          <p className="text-xs text-muted-foreground">
                            Reduce spacing for more content
                          </p>
                        </div>
                        <Switch
                          checked={settings.appearance.compactMode}
                          onCheckedChange={(v) => updateAppearance('compactMode', v)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Animations</Label>
                          <p className="text-xs text-muted-foreground">
                            Enable smooth transitions and effects
                          </p>
                        </div>
                        <Switch
                          checked={settings.appearance.animations}
                          onCheckedChange={(v) => updateAppearance('animations', v)}
                        />
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Font size</Label>
                        <Select
                          value={settings.appearance.fontSize}
                          onValueChange={(v) => updateAppearance('fontSize', v as AppearanceSettings['fontSize'])}
                        >
                          <SelectTrigger className="w-44 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="small">Small (14px)</SelectItem>
                            <SelectItem value="medium">Medium (16px)</SelectItem>
                            <SelectItem value="large">Large (18px)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Productivity Tab */}
              {activeTab === 'productivity' && (
                <>
                  <div>
                    <h3 className="text-lg font-semibold">Productivity</h3>
                    <p className="text-sm text-muted-foreground">
                      Optimize your workflow and task management
                    </p>
                  </div>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Default Views
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Default task view</Label>
                        <Select
                          value={settings.productivity.defaultTaskView}
                          onValueChange={(v) => updateProductivity('defaultTaskView', v as ProductivitySettings['defaultTaskView'])}
                        >
                          <SelectTrigger className="w-44 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="list">List view</SelectItem>
                            <SelectItem value="board">Board view</SelectItem>
                            <SelectItem value="calendar">Calendar view</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Default task priority</Label>
                        <Select
                          value={settings.productivity.defaultPriority}
                          onValueChange={(v) => updateProductivity('defaultPriority', v as ProductivitySettings['defaultPriority'])}
                        >
                          <SelectTrigger className="w-44 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Separator />
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Show completed tasks</Label>
                          <p className="text-xs text-muted-foreground">
                            Display completed tasks in task lists
                          </p>
                        </div>
                        <Switch
                          checked={settings.productivity.showCompletedTasks}
                          onCheckedChange={(v) => updateProductivity('showCompletedTasks', v)}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        Auto-save
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Enable auto-save</Label>
                          <p className="text-xs text-muted-foreground">
                            Automatically save changes as you work
                          </p>
                        </div>
                        <Switch
                          checked={settings.productivity.autoSave}
                          onCheckedChange={(v) => updateProductivity('autoSave', v)}
                        />
                      </div>
                      
                      {settings.productivity.autoSave && (
                        <div className="space-y-3">
                          <Label className="text-xs text-muted-foreground">
                            Save interval: <span className="font-medium">{settings.productivity.autoSaveInterval} seconds</span>
                          </Label>
                          <Slider
                            value={[settings.productivity.autoSaveInterval]}
                            onValueChange={([v]) => updateProductivity('autoSaveInterval', v)}
                            min={10}
                            max={120}
                            step={10}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>10s</span>
                            <span>120s</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Zap className="h-4 w-4 text-purple-500" />
                        AI Features
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">AI suggestions</Label>
                          <p className="text-xs text-muted-foreground">
                            Get smart suggestions for tasks and priorities
                          </p>
                        </div>
                        <Switch
                          checked={settings.productivity.aiSuggestions}
                          onCheckedChange={(v) => updateProductivity('aiSuggestions', v)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Privacy Tab */}
              {activeTab === 'privacy' && (
                <>
                  <div>
                    <h3 className="text-lg font-semibold">Privacy</h3>
                    <p className="text-sm text-muted-foreground">
                      Control your privacy and visibility settings
                    </p>
                  </div>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Visibility
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Show online status</Label>
                          <p className="text-xs text-muted-foreground">
                            Let others see when you're online
                          </p>
                        </div>
                        <Switch
                          checked={settings.privacy.showOnlineStatus}
                          onCheckedChange={(v) => updatePrivacy('showOnlineStatus', v)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Show activity status</Label>
                          <p className="text-xs text-muted-foreground">
                            Show what you're currently working on
                          </p>
                        </div>
                        <Switch
                          checked={settings.privacy.showActivityStatus}
                          onCheckedChange={(v) => updatePrivacy('showActivityStatus', v)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Allow mentions</Label>
                          <p className="text-xs text-muted-foreground">
                            Let others @mention you in comments
                          </p>
                        </div>
                        <Switch
                          checked={settings.privacy.allowMentions}
                          onCheckedChange={(v) => updatePrivacy('allowMentions', v)}
                        />
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Profile visibility</Label>
                        <Select
                          value={settings.privacy.profileVisibility}
                          onValueChange={(v) => updatePrivacy('profileVisibility', v as PrivacySettings['profileVisibility'])}
                        >
                          <SelectTrigger className="w-44 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">Public</SelectItem>
                            <SelectItem value="team">Team only</SelectItem>
                            <SelectItem value="private">Private</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Control who can see your profile information
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Shortcuts Tab */}
              {activeTab === 'shortcuts' && (
                <>
                  <div>
                    <h3 className="text-lg font-semibold">Keyboard Shortcuts</h3>
                    <p className="text-sm text-muted-foreground">
                      Quick reference for keyboard shortcuts
                    </p>
                  </div>

                  <Card>
                    <CardContent className="pt-6 space-y-6">
                      {shortcutsData.map((group, groupIndex) => (
                        <div key={group.category}>
                          <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                            {group.category}
                          </h4>
                          <div className="space-y-2">
                            {group.shortcuts.map((shortcut, index) => (
                              <div 
                                key={index} 
                                className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50"
                              >
                                <span className="text-sm">{shortcut.description}</span>
                                <div className="flex items-center gap-1">
                                  {shortcut.keys.map((key, keyIndex) => (
                                    <React.Fragment key={keyIndex}>
                                      <kbd className="inline-flex items-center justify-center min-w-[24px] px-2 py-1 text-xs font-medium bg-muted border rounded shadow-sm">
                                        {key}
                                      </kbd>
                                      {keyIndex < shortcut.keys.length - 1 && (
                                        <span className="text-xs text-muted-foreground mx-0.5">+</span>
                                      )}
                                    </React.Fragment>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                          {groupIndex < shortcutsData.length - 1 && (
                            <Separator className="mt-4" />
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Account Tab */}
              {activeTab === 'account' && (
                <>
                  <div>
                    <h3 className="text-lg font-semibold">Account</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage your account settings and data
                    </p>
                  </div>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Profile
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                          <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                            {userInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold text-lg">{user?.name || 'User'}</p>
                          <p className="text-sm text-muted-foreground">{user?.email || 'user@example.com'}</p>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full">
                        <User className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Data Management
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button variant="outline" className="w-full justify-start">
                        <Download className="h-4 w-4 mr-2" />
                        Export my data
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete account
                      </Button>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
          <Button 
            variant="ghost" 
            onClick={handleReset}
            className="text-muted-foreground"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to defaults
          </Button>
          
          <div className="flex items-center gap-3">
            {hasChanges && (
              <Badge variant="outline" className="text-xs font-normal bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                Unsaved changes
              </Badge>
            )}
            
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="min-w-[120px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save changes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SettingsDialog;

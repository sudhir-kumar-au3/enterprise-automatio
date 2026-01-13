import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { 
  Loader2, 
  Bell,
  Moon,
  Sun,
  Monitor,
  Globe,
  Shield,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  Download,
  Database,
  Palette,
  Volume2,
  Mail,
  MessageSquare,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SettingsPageProps {
  onClose: () => void;
}

interface NotificationSettings {
  email: boolean;
  push: boolean;
  taskAssigned: boolean;
  taskDue: boolean;
  mentions: boolean;
  weeklyDigest: boolean;
}

interface PrivacySettings {
  showOnlineStatus: boolean;
  showActivityStatus: boolean;
}

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  compactMode: boolean;
  animations: boolean;
}

export function SettingsPage({ onClose }: SettingsPageProps) {
  const { user, logout } = useAuth();
  
  // Notification settings
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email: true,
    push: true,
    taskAssigned: true,
    taskDue: true,
    mentions: true,
    weeklyDigest: false
  });

  // Privacy settings
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    showOnlineStatus: true,
    showActivityStatus: true
  });

  // Appearance settings
  const [appearance, setAppearance] = useState<AppearanceSettings>({
    theme: 'system',
    compactMode: false,
    animations: true
  });

  // Delete account dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Export data
  const [isExporting, setIsExporting] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem('settings_notifications');
    const savedPrivacy = localStorage.getItem('settings_privacy');
    const savedAppearance = localStorage.getItem('settings_appearance');

    if (savedNotifications) setNotifications(JSON.parse(savedNotifications));
    if (savedPrivacy) setPrivacy(JSON.parse(savedPrivacy));
    if (savedAppearance) setAppearance(JSON.parse(savedAppearance));
  }, []);

  // Save settings when they change
  const saveNotifications = (newSettings: NotificationSettings) => {
    setNotifications(newSettings);
    localStorage.setItem('settings_notifications', JSON.stringify(newSettings));
    toast.success('Notification settings saved');
  };

  const savePrivacy = (newSettings: PrivacySettings) => {
    setPrivacy(newSettings);
    localStorage.setItem('settings_privacy', JSON.stringify(newSettings));
    toast.success('Privacy settings saved');
  };

  const saveAppearance = (newSettings: AppearanceSettings) => {
    setAppearance(newSettings);
    localStorage.setItem('settings_appearance', JSON.stringify(newSettings));
    
    // Apply theme change
    if (newSettings.theme === 'dark') {
      document.documentElement.setAttribute('data-appearance', 'dark');
    } else if (newSettings.theme === 'light') {
      document.documentElement.removeAttribute('data-appearance');
    } else {
      // System preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-appearance', 'dark');
      } else {
        document.documentElement.removeAttribute('data-appearance');
      }
    }
    
    toast.success('Appearance settings saved');
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      // Gather all user data
      const userData = {
        profile: user,
        settings: {
          notifications,
          privacy,
          appearance
        },
        tasks: JSON.parse(localStorage.getItem('collab_tasks') || '[]'),
        comments: JSON.parse(localStorage.getItem('collab_comments') || '[]'),
        exportedAt: new Date().toISOString()
      };

      // Create and download file
      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `team-hub-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Data exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') return;
    
    setIsDeleting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Clear all local data
      localStorage.clear();
      
      toast.success('Account deleted successfully');
      logout();
    } catch (error) {
      toast.error('Failed to delete account');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>Customize how Pulsework.io looks on your device</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Theme</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
                { value: 'system', label: 'System', icon: Monitor }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => saveAppearance({ ...appearance, theme: value as AppearanceSettings['theme'] })}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                    appearance.theme === value 
                      ? "border-primary bg-primary/5" 
                      : "border-muted hover:border-muted-foreground/30"
                  )}
                >
                  <Icon className={cn(
                    "h-6 w-6",
                    appearance.theme === value ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-sm font-medium",
                    appearance.theme === value ? "text-primary" : "text-muted-foreground"
                  )}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Compact Mode</Label>
              <p className="text-sm text-muted-foreground">Use smaller spacing and fonts</p>
            </div>
            <Switch
              checked={appearance.compactMode}
              onCheckedChange={(checked) => saveAppearance({ ...appearance, compactMode: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Animations</Label>
              <p className="text-sm text-muted-foreground">Enable smooth transitions and animations</p>
            </div>
            <Switch
              checked={appearance.animations}
              onCheckedChange={(checked) => saveAppearance({ ...appearance, animations: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Choose what notifications you want to receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">Email Notifications</Label>
                <p className="text-xs text-muted-foreground">Receive updates via email</p>
              </div>
            </div>
            <Switch
              checked={notifications.email}
              onCheckedChange={(checked) => saveNotifications({ ...notifications, email: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Volume2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">Push Notifications</Label>
                <p className="text-xs text-muted-foreground">Receive browser push notifications</p>
              </div>
            </div>
            <Switch
              checked={notifications.push}
              onCheckedChange={(checked) => saveNotifications({ ...notifications, push: checked })}
            />
          </div>

          <Separator />

          <p className="text-sm font-medium">Notify me about:</p>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm">Task assignments</Label>
              </div>
              <Switch
                checked={notifications.taskAssigned}
                onCheckedChange={(checked) => saveNotifications({ ...notifications, taskAssigned: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm">Due date reminders</Label>
              </div>
              <Switch
                checked={notifications.taskDue}
                onCheckedChange={(checked) => saveNotifications({ ...notifications, taskDue: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm">Mentions and replies</Label>
              </div>
              <Switch
                checked={notifications.mentions}
                onCheckedChange={(checked) => saveNotifications({ ...notifications, mentions: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm">Weekly digest</Label>
              </div>
              <Switch
                checked={notifications.weeklyDigest}
                onCheckedChange={(checked) => saveNotifications({ ...notifications, weeklyDigest: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy
          </CardTitle>
          <CardDescription>Control your visibility and data sharing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Show Online Status</Label>
              <p className="text-sm text-muted-foreground">Let others see when you're online</p>
            </div>
            <Switch
              checked={privacy.showOnlineStatus}
              onCheckedChange={(checked) => savePrivacy({ ...privacy, showOnlineStatus: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Show Activity Status</Label>
              <p className="text-sm text-muted-foreground">Show your recent activity to team members</p>
            </div>
            <Switch
              checked={privacy.showActivityStatus}
              onCheckedChange={(checked) => savePrivacy({ ...privacy, showActivityStatus: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Management
          </CardTitle>
          <CardDescription>Export your data or manage your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Download className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Export Your Data</p>
                <p className="text-sm text-muted-foreground">Download all your data as JSON</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleExportData} disabled={isExporting}>
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Export
            </Button>
          </div>

          <Separator />

          <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-medium text-destructive">Delete Account</p>
                  <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                </div>
              </div>
              <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                All your tasks, comments, and settings will be permanently deleted.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label htmlFor="delete-confirmation">
                Type <strong>DELETE</strong> to confirm
              </Label>
              <Input
                id="delete-confirmation"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="DELETE"
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDeleteDialog(false);
              setDeleteConfirmation('');
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmation !== 'DELETE' || isDeleting}
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SettingsPage;

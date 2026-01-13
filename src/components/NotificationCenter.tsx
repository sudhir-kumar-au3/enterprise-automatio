import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useNotifications, Notification } from '@/contexts/PowerFeaturesContext';
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Trash2,
  X,
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AtSign,
  UserPlus,
  Clock,
  ExternalLink,
  Settings,
  Volume2,
  VolumeX
} from 'lucide-react';

const notificationIcons: Record<Notification['type'], React.ReactNode> = {
  info: <Info className="h-4 w-4 text-blue-500" />,
  success: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  warning: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  error: <XCircle className="h-4 w-4 text-red-500" />,
  mention: <AtSign className="h-4 w-4 text-purple-500" />,
  assignment: <UserPlus className="h-4 w-4 text-blue-500" />,
  deadline: <Clock className="h-4 w-4 text-orange-500" />,
};

const notificationColors: Record<Notification['type'], string> = {
  info: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20',
  success: 'bg-green-50 border-green-200 dark:bg-green-950/20',
  warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20',
  error: 'bg-red-50 border-red-200 dark:bg-red-950/20',
  mention: 'bg-purple-50 border-purple-200 dark:bg-purple-950/20',
  assignment: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20',
  deadline: 'bg-orange-50 border-orange-200 dark:bg-orange-950/20',
};

export function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const groupedNotifications = React.useMemo(() => {
    const today: Notification[] = [];
    const yesterday: Notification[] = [];
    const older: Notification[] = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;

    filteredNotifications.forEach(notif => {
      if (notif.timestamp >= todayStart) {
        today.push(notif);
      } else if (notif.timestamp >= yesterdayStart) {
        yesterday.push(notif);
      } else {
        older.push(notif);
      }
    });

    return { today, yesterday, older };
  }, [filteredNotifications]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          aria-label="Notifications"
        >
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[400px] p-0" 
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={markAllAsRead}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={clearAll}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 p-2 border-b">
          <Button
            variant={filter === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter('all')}
          >
            All ({notifications.length})
          </Button>
          <Button
            variant={filter === 'unread' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </Button>
        </div>

        {/* Notifications List */}
        <ScrollArea className="max-h-[400px]">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                You're all caught up!
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {/* Today */}
              {groupedNotifications.today.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-muted/50">
                    <span className="text-xs font-medium text-muted-foreground">Today</span>
                  </div>
                  {groupedNotifications.today.map(notification => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onRemove={removeNotification}
                      formatTimestamp={formatTimestamp}
                    />
                  ))}
                </div>
              )}

              {/* Yesterday */}
              {groupedNotifications.yesterday.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-muted/50">
                    <span className="text-xs font-medium text-muted-foreground">Yesterday</span>
                  </div>
                  {groupedNotifications.yesterday.map(notification => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onRemove={removeNotification}
                      formatTimestamp={formatTimestamp}
                    />
                  ))}
                </div>
              )}

              {/* Older */}
              {groupedNotifications.older.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-muted/50">
                    <span className="text-xs font-medium text-muted-foreground">Earlier</span>
                  </div>
                  {groupedNotifications.older.map(notification => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onRemove={removeNotification}
                      formatTimestamp={formatTimestamp}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-2 border-t bg-muted/30">
            <Button variant="ghost" className="w-full text-xs h-8 gap-2">
              <Settings className="h-3.5 w-3.5" />
              Notification Settings
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onRemove: (id: string) => void;
  formatTimestamp: (timestamp: number) => string;
}

function NotificationItem({ notification, onMarkAsRead, onRemove, formatTimestamp }: NotificationItemProps) {
  return (
    <div
      className={cn(
        "relative px-4 py-3 hover:bg-muted/50 transition-colors group",
        !notification.read && "bg-primary/5"
      )}
    >
      {/* Unread indicator */}
      {!notification.read && (
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" />
      )}

      <div className="flex gap-3">
        {/* Icon */}
        <div className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 border",
          notificationColors[notification.type]
        )}>
          {notificationIcons[notification.type]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm",
            !notification.read && "font-medium"
          )}>
            {notification.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notification.message}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(notification.timestamp)}
            </span>
            {notification.actionLabel && (
              <Button 
                variant="link" 
                size="sm" 
                className="h-auto p-0 text-xs"
              >
                {notification.actionLabel}
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!notification.read && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onMarkAsRead(notification.id)}
              title="Mark as read"
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(notification.id)}
            title="Remove"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default NotificationCenter;

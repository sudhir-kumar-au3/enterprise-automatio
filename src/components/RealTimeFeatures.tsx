import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Task, TeamMember, Comment } from '@/lib/collaboration-data';
import {
  Activity,
  CheckCircle2,
  MessageSquare,
  UserPlus,
  Edit3,
  Trash2,
  ArrowRight,
  Clock,
  Zap,
  Eye,
  Users,
  Circle,
  AlertCircle,
  Star,
  GitBranch,
  Flag,
  Tag
} from 'lucide-react';

// Activity types
type ActivityType = 
  | 'task_created'
  | 'task_completed'
  | 'task_updated'
  | 'task_assigned'
  | 'task_commented'
  | 'task_priority_changed'
  | 'task_status_changed'
  | 'member_joined'
  | 'member_mentioned';

interface ActivityItem {
  id: string;
  type: ActivityType;
  actorId: string;
  taskId?: string;
  targetId?: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

interface RealTimePresenceProps {
  teamMembers: TeamMember[];
  currentUserId?: string;
}

interface ActivityFeedProps {
  tasks: Task[];
  teamMembers: TeamMember[];
  comments: Comment[];
  maxItems?: number;
}

// Simulated presence data
const presenceStatuses = ['viewing_dashboard', 'editing_task', 'in_meeting', 'away', 'active'] as const;
type PresenceStatus = typeof presenceStatuses[number];

interface MemberPresence {
  memberId: string;
  status: PresenceStatus;
  currentTask?: string;
  lastSeen: number;
  isTyping?: boolean;
}

// Real-Time Presence Component
export function RealTimePresence({ teamMembers, currentUserId }: RealTimePresenceProps) {
  const [presenceData, setPresenceData] = useState<Map<string, MemberPresence>>(new Map());
  const [expandedView, setExpandedView] = useState(false);

  // Simulate real-time presence updates
  useEffect(() => {
    const updatePresence = () => {
      const newPresence = new Map<string, MemberPresence>();
      
      teamMembers.forEach(member => {
        if (member.isOnline) {
          newPresence.set(member.id, {
            memberId: member.id,
            status: presenceStatuses[Math.floor(Math.random() * presenceStatuses.length)],
            currentTask: Math.random() > 0.5 ? `task-${Math.floor(Math.random() * 10)}` : undefined,
            lastSeen: Date.now(),
            isTyping: Math.random() > 0.9,
          });
        }
      });
      
      setPresenceData(newPresence);
    };

    updatePresence();
    const interval = setInterval(updatePresence, 10000); // Update every 10 seconds
    
    return () => clearInterval(interval);
  }, [teamMembers]);

  const onlineMembers = teamMembers.filter(m => m.isOnline);
  const offlineMembers = teamMembers.filter(m => !m.isOnline);

  const getStatusColor = (status: PresenceStatus) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'editing_task': return 'bg-blue-500';
      case 'viewing_dashboard': return 'bg-purple-500';
      case 'in_meeting': return 'bg-orange-500';
      case 'away': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status: PresenceStatus) => {
    switch (status) {
      case 'active': return 'Active';
      case 'editing_task': return 'Editing task';
      case 'viewing_dashboard': return 'Viewing dashboard';
      case 'in_meeting': return 'In a meeting';
      case 'away': return 'Away';
      default: return 'Unknown';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Team Presence
          </CardTitle>
          <Badge variant="secondary" className="gap-1">
            <Circle className="h-2 w-2 fill-green-500 text-green-500" />
            {onlineMembers.length} online
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Online Members */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Online Now
            </span>
          </div>
          
          {/* Compact Avatar Stack */}
          {!expandedView && (
            <div className="flex items-center">
              <div className="flex -space-x-2">
                {onlineMembers.slice(0, 5).map((member, index) => {
                  const presence = presenceData.get(member.id);
                  return (
                    <TooltipProvider key={member.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div 
                            className="relative"
                            style={{ zIndex: 10 - index }}
                          >
                            <Avatar className="h-10 w-10 border-2 border-background">
                              <AvatarImage src={member.avatarUrl} />
                              <AvatarFallback className="text-xs">
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className={cn(
                              "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background",
                              getStatusColor(presence?.status || 'active')
                            )}>
                              {presence?.isTyping && (
                                <span className="absolute inset-0 flex items-center justify-center">
                                  <span className="animate-pulse text-white text-[8px]">•••</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <div className="text-sm">
                            <p className="font-medium">{member.name}</p>
                            <p className="text-muted-foreground text-xs">
                              {getStatusLabel(presence?.status || 'active')}
                              {presence?.isTyping && ' • Typing...'}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
              {onlineMembers.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 h-10 w-10 rounded-full"
                  onClick={() => setExpandedView(true)}
                >
                  +{onlineMembers.length - 5}
                </Button>
              )}
            </div>
          )}

          {/* Expanded View */}
          {expandedView && (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {onlineMembers.map(member => {
                  const presence = presenceData.get(member.id);
                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="relative">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={member.avatarUrl} />
                          <AvatarFallback className="text-xs">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                          getStatusColor(presence?.status || 'active')
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            getStatusColor(presence?.status || 'active')
                          )} />
                          {getStatusLabel(presence?.status || 'active')}
                          {presence?.isTyping && (
                            <span className="text-blue-500 animate-pulse">• Typing...</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {expandedView && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => setExpandedView(false)}
            >
              Show less
            </Button>
          )}
        </div>

        {/* Offline Members */}
        {offlineMembers.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Offline ({offlineMembers.length})
              </span>
              <div className="flex -space-x-1">
                {offlineMembers.slice(0, 8).map(member => (
                  <TooltipProvider key={member.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Avatar className="h-7 w-7 border-2 border-background opacity-50">
                          <AvatarImage src={member.avatarUrl} />
                          <AvatarFallback className="text-[10px]">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-sm">{member.name}</p>
                        <p className="text-xs text-muted-foreground">Offline</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
                {offlineMembers.length > 8 && (
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground border-2 border-background">
                    +{offlineMembers.length - 8}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Activity Feed Component
export function ActivityFeed({ tasks, teamMembers, comments, maxItems = 20 }: ActivityFeedProps) {
  // Generate activity items from data
  const activities = useMemo(() => {
    const items: ActivityItem[] = [];

    // Task activities
    tasks.forEach(task => {
      items.push({
        id: `created-${task.id}`,
        type: 'task_created',
        actorId: task.assigneeId || teamMembers[0]?.id || '',
        taskId: task.id,
        timestamp: task.createdAt,
        metadata: { taskTitle: task.title },
      });

      if (task.status === 'done') {
        items.push({
          id: `completed-${task.id}`,
          type: 'task_completed',
          actorId: task.assigneeId || teamMembers[0]?.id || '',
          taskId: task.id,
          timestamp: task.updatedAt,
          metadata: { taskTitle: task.title },
        });
      }
    });

    // Comment activities
    comments.forEach(comment => {
      items.push({
        id: `comment-${comment.id}`,
        type: 'task_commented',
        actorId: comment.authorId,
        taskId: comment.contextId,
        timestamp: comment.timestamp,
        metadata: { 
          preview: comment.content.slice(0, 50) + (comment.content.length > 50 ? '...' : ''),
        },
      });
    });

    // Sort by timestamp descending
    return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, maxItems);
  }, [tasks, comments, teamMembers, maxItems]);

  const getMemberById = (id: string) => teamMembers.find(m => m.id === id);
  const getTaskById = (id: string) => tasks.find(t => t.id === id);

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'task_created': return <Zap className="h-4 w-4 text-blue-500" />;
      case 'task_completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'task_updated': return <Edit3 className="h-4 w-4 text-purple-500" />;
      case 'task_assigned': return <UserPlus className="h-4 w-4 text-orange-500" />;
      case 'task_commented': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'task_priority_changed': return <Flag className="h-4 w-4 text-red-500" />;
      case 'task_status_changed': return <ArrowRight className="h-4 w-4 text-purple-500" />;
      case 'member_joined': return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'member_mentioned': return <Star className="h-4 w-4 text-yellow-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityText = (activity: ActivityItem) => {
    const actor = getMemberById(activity.actorId);
    const task = activity.taskId ? getTaskById(activity.taskId) : null;
    const actorName = actor?.name || 'Someone';
    const taskTitle = activity.metadata?.taskTitle || task?.title || 'a task';

    switch (activity.type) {
      case 'task_created':
        return <><strong>{actorName}</strong> created <strong>{taskTitle}</strong></>;
      case 'task_completed':
        return <><strong>{actorName}</strong> completed <strong>{taskTitle}</strong></>;
      case 'task_updated':
        return <><strong>{actorName}</strong> updated <strong>{taskTitle}</strong></>;
      case 'task_assigned':
        return <><strong>{actorName}</strong> was assigned to <strong>{taskTitle}</strong></>;
      case 'task_commented':
        return <><strong>{actorName}</strong> commented on <strong>{taskTitle}</strong></>;
      case 'task_priority_changed':
        return <><strong>{actorName}</strong> changed priority of <strong>{taskTitle}</strong></>;
      case 'task_status_changed':
        return <><strong>{actorName}</strong> moved <strong>{taskTitle}</strong></>;
      case 'member_joined':
        return <><strong>{actorName}</strong> joined the team</>;
      case 'member_mentioned':
        return <><strong>{actorName}</strong> was mentioned</>;
      default:
        return <><strong>{actorName}</strong> performed an action</>;
    }
  };

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

  // Group activities by day
  const groupedActivities = useMemo(() => {
    const groups: { label: string; items: ActivityItem[] }[] = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;

    let currentGroup: { label: string; items: ActivityItem[] } | null = null;

    activities.forEach(activity => {
      let label: string;
      if (activity.timestamp >= today) {
        label = 'Today';
      } else if (activity.timestamp >= yesterday) {
        label = 'Yesterday';
      } else {
        label = new Date(activity.timestamp).toLocaleDateString('en-US', { 
          weekday: 'long',
          month: 'short', 
          day: 'numeric' 
        });
      }

      if (!currentGroup || currentGroup.label !== label) {
        currentGroup = { label, items: [] };
        groups.push(currentGroup);
      }
      currentGroup.items.push(activity);
    });

    return groups;
  }, [activities]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Activity Feed
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Live
            <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {groupedActivities.length === 0 ? (
            <div className="py-12 text-center">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No activity yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedActivities.map((group, groupIndex) => (
                <div key={group.label}>
                  <div className="sticky top-0 bg-background/95 backdrop-blur py-1 mb-3 z-10">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {group.label}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {group.items.map((activity, index) => {
                      const actor = getMemberById(activity.actorId);
                      return (
                        <div
                          key={activity.id}
                          className="flex gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                        >
                          <div className="relative flex-shrink-0">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={actor?.avatarUrl} />
                              <AvatarFallback className="text-[10px]">
                                {actor?.name.split(' ').map(n => n[0]).join('') || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-background flex items-center justify-center">
                              {getActivityIcon(activity.type)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm leading-relaxed">
                              {getActivityText(activity)}
                            </p>
                            {activity.metadata?.preview && (
                              <p className="text-xs text-muted-foreground mt-1 italic line-clamp-1">
                                "{activity.metadata.preview}"
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTimestamp(activity.timestamp)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default { RealTimePresence, ActivityFeed };

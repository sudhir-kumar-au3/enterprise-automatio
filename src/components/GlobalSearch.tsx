import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Task, TeamMember, Comment } from '@/lib/collaboration-data';
import {
  Search,
  X,
  CheckSquare,
  Users,
  MessageSquare,
  FileText,
  Clock,
  Tag,
  Filter,
  ArrowRight,
  Loader2,
  History,
  Sparkles,
  TrendingUp,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  teamMembers: TeamMember[];
  comments: Comment[];
  onTaskClick?: (task: Task) => void;
  onMemberClick?: (member: TeamMember) => void;
}

interface SearchResult {
  id: string;
  type: 'task' | 'member' | 'comment';
  title: string;
  subtitle?: string;
  metadata?: Record<string, any>;
  score: number;
  highlight?: string;
}

const RECENT_SEARCHES_KEY = 'global_search_recent';
const MAX_RECENT_SEARCHES = 5;

export function GlobalSearch({ 
  isOpen, 
  onClose, 
  tasks, 
  teamMembers, 
  comments,
  onTaskClick,
  onMemberClick 
}: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'tasks' | 'members' | 'comments'>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Load recent searches
  useEffect(() => {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

  // Save recent search
  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setRecentSearches(prev => {
      const updated = [searchQuery, ...prev.filter(s => s !== searchQuery)].slice(0, MAX_RECENT_SEARCHES);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Fuzzy search function
  const fuzzyMatch = useCallback((text: string, searchQuery: string): { match: boolean; score: number; highlight: string } => {
    const lowerText = text.toLowerCase();
    const lowerQuery = searchQuery.toLowerCase();
    
    // Exact match
    if (lowerText.includes(lowerQuery)) {
      const index = lowerText.indexOf(lowerQuery);
      const highlight = text.slice(0, index) + 
        `<mark>${text.slice(index, index + searchQuery.length)}</mark>` + 
        text.slice(index + searchQuery.length);
      return { match: true, score: 100 - index, highlight };
    }
    
    // Word start match
    const words = lowerText.split(/\s+/);
    for (const word of words) {
      if (word.startsWith(lowerQuery)) {
        return { match: true, score: 80, highlight: text };
      }
    }
    
    // Fuzzy match
    let queryIndex = 0;
    let score = 0;
    for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
      if (lowerText[i] === lowerQuery[queryIndex]) {
        queryIndex++;
        score += 10;
      }
    }
    
    if (queryIndex === lowerQuery.length) {
      return { match: true, score, highlight: text };
    }
    
    return { match: false, score: 0, highlight: text };
  }, []);

  // Search results
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    
    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    // Search tasks
    if (activeTab === 'all' || activeTab === 'tasks') {
      tasks.forEach(task => {
        const titleMatch = fuzzyMatch(task.title, query);
        const descMatch = task.description ? fuzzyMatch(task.description, query) : { match: false, score: 0 };
        const tagMatch = (task.tags || []).some(tag => tag.toLowerCase().includes(lowerQuery));
        
        if (titleMatch.match || descMatch.match || tagMatch) {
          results.push({
            id: task.id,
            type: 'task',
            title: task.title,
            subtitle: task.description?.slice(0, 100),
            metadata: { status: task.status, priority: task.priority, dueDate: task.dueDate },
            score: Math.max(titleMatch.score * 1.5, descMatch.score, tagMatch ? 50 : 0),
            highlight: titleMatch.highlight,
          });
        }
      });
    }

    // Search team members
    if (activeTab === 'all' || activeTab === 'members') {
      teamMembers.forEach(member => {
        const nameMatch = fuzzyMatch(member.name, query);
        const emailMatch = fuzzyMatch(member.email, query);
        const roleMatch = member.role.toLowerCase().includes(lowerQuery);
        
        if (nameMatch.match || emailMatch.match || roleMatch) {
          results.push({
            id: member.id,
            type: 'member',
            title: member.name,
            subtitle: member.email,
            metadata: { role: member.role, isOnline: member.isOnline },
            score: Math.max(nameMatch.score * 1.5, emailMatch.score, roleMatch ? 60 : 0),
            highlight: nameMatch.highlight,
          });
        }
      });
    }

    // Search comments
    if (activeTab === 'all' || activeTab === 'comments') {
      comments.forEach(comment => {
        const contentMatch = fuzzyMatch(comment.content, query);
        const author = teamMembers.find(m => m.id === comment.authorId);
        
        if (contentMatch.match) {
          results.push({
            id: comment.id,
            type: 'comment',
            title: comment.content.slice(0, 80) + (comment.content.length > 80 ? '...' : ''),
            subtitle: `By ${author?.name || 'Unknown'} • ${new Date(comment.timestamp).toLocaleDateString()}`,
            metadata: { authorId: comment.authorId, timestamp: comment.timestamp },
            score: contentMatch.score,
            highlight: contentMatch.highlight,
          });
        }
      });
    }

    // Sort by score
    return results.sort((a, b) => b.score - a.score).slice(0, 20);
  }, [query, activeTab, tasks, teamMembers, comments, fuzzyMatch]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < searchResults.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : searchResults.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (searchResults[selectedIndex]) {
            handleResultClick(searchResults[selectedIndex]);
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchResults, selectedIndex, onClose]);

  const handleResultClick = (result: SearchResult) => {
    saveRecentSearch(query);
    
    if (result.type === 'task' && onTaskClick) {
      const task = tasks.find(t => t.id === result.id);
      if (task) onTaskClick(task);
    } else if (result.type === 'member' && onMemberClick) {
      const member = teamMembers.find(m => m.id === result.id);
      if (member) onMemberClick(member);
    }
    
    onClose();
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'task': return <CheckSquare className="h-4 w-4" />;
      case 'member': return <Users className="h-4 w-4" />;
      case 'comment': return <MessageSquare className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-500';
      case 'in-progress': return 'bg-blue-500';
      case 'review': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-blue-600';
    }
  };

  const resultCounts = useMemo(() => ({
    all: searchResults.length,
    tasks: searchResults.filter(r => r.type === 'task').length,
    members: searchResults.filter(r => r.type === 'member').length,
    comments: searchResults.filter(r => r.type === 'comment').length,
  }), [searchResults]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Search Header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks, team members, comments..."
              className="border-0 shadow-none focus-visible:ring-0 px-0 text-lg"
              autoFocus
            />
            {query && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Filter Tabs */}
          {query && (
            <div className="flex items-center gap-2 mt-3">
              {(['all', 'tasks', 'members', 'comments'] as const).map(tab => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs capitalize gap-1"
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                  <Badge variant="secondary" className="ml-1 text-xs px-1.5">
                    {resultCounts[tab]}
                  </Badge>
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Search Results */}
        <ScrollArea className="max-h-[400px]">
          {!query ? (
            /* Empty State - Recent Searches & Quick Actions */
            <div className="p-4 space-y-6">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Recent Searches
                  </h4>
                  <div className="space-y-1">
                    {recentSearches.map((search, i) => (
                      <button
                        key={i}
                        onClick={() => setQuery(search)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/80 text-left transition-colors"
                      >
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{search}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Filters */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Quick Filters
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setQuery('status:in-progress')}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-muted/80 text-left transition-colors"
                  >
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-sm">In Progress Tasks</span>
                  </button>
                  <button
                    onClick={() => setQuery('priority:high')}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-muted/80 text-left transition-colors"
                  >
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">High Priority</span>
                  </button>
                  <button
                    onClick={() => setQuery('due:today')}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-muted/80 text-left transition-colors"
                  >
                    <Calendar className="h-4 w-4 text-red-500" />
                    <span className="text-sm">Due Today</span>
                  </button>
                  <button
                    onClick={() => setQuery('online')}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-muted/80 text-left transition-colors"
                  >
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm">Online Members</span>
                  </button>
                </div>
              </div>

              {/* Trending */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Trending Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {['frontend', 'backend', 'urgent', 'bug', 'feature', 'documentation'].map(tag => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => setQuery(`tag:${tag}`)}
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ) : searchResults.length === 0 ? (
            /* No Results */
            <div className="py-12 text-center">
              <Search className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                No results found for "{query}"
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Try different keywords or check your spelling
              </p>
            </div>
          ) : (
            /* Results List */
            <div className="p-2">
              {searchResults.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-all",
                    index === selectedIndex 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-muted/80"
                  )}
                >
                  {/* Icon or Avatar */}
                  {result.type === 'member' ? (
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={teamMembers.find(m => m.id === result.id)?.avatarUrl} />
                      <AvatarFallback>
                        {result.title.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                      index === selectedIndex ? "bg-primary-foreground/20" : "bg-muted"
                    )}>
                      {getResultIcon(result.type)}
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn(
                        "font-medium text-sm truncate",
                        index === selectedIndex ? "text-primary-foreground" : ""
                      )}>
                        {result.title}
                      </p>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs capitalize flex-shrink-0",
                          index === selectedIndex ? "border-primary-foreground/30 text-primary-foreground" : ""
                        )}
                      >
                        {result.type}
                      </Badge>
                    </div>
                    {result.subtitle && (
                      <p className={cn(
                        "text-xs truncate mt-0.5",
                        index === selectedIndex ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        {result.subtitle}
                      </p>
                    )}
                    
                    {/* Metadata */}
                    {result.metadata && result.type === 'task' && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className={cn(
                          "h-2 w-2 rounded-full",
                          getStatusColor(result.metadata.status)
                        )} />
                        <span className={cn(
                          "text-xs capitalize",
                          index === selectedIndex ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}>
                          {result.metadata.status}
                        </span>
                        <span className={cn(
                          "text-xs capitalize",
                          index === selectedIndex ? "text-primary-foreground/70" : getPriorityColor(result.metadata.priority)
                        )}>
                          • {result.metadata.priority}
                        </span>
                        {result.metadata.dueDate && (
                          <span className={cn(
                            "text-xs",
                            index === selectedIndex ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}>
                            • Due {new Date(result.metadata.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}
                    {result.metadata && result.type === 'member' && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className={cn(
                          "h-2 w-2 rounded-full",
                          result.metadata.isOnline ? "bg-green-500" : "bg-gray-400"
                        )} />
                        <span className={cn(
                          "text-xs capitalize",
                          index === selectedIndex ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}>
                          {result.metadata.role}
                        </span>
                      </div>
                    )}
                  </div>

                  <ArrowRight className={cn(
                    "h-4 w-4 flex-shrink-0 mt-3 transition-transform",
                    index === selectedIndex ? "text-primary-foreground translate-x-0.5" : "text-muted-foreground/50"
                  )} />
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded">↑↓</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded">↵</kbd>
              <span>Open</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded">ESC</kbd>
              <span>Close</span>
            </div>
          </div>
          {query && (
            <span>{searchResults.length} results</span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default GlobalSearch;

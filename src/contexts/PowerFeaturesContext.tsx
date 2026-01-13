import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';

// Types for the Command Palette
export interface Command {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string[];
  action: () => void;
  category: 'navigation' | 'actions' | 'settings' | 'search' | 'ai';
  keywords?: string[];
}

export interface SearchResult {
  id: string;
  type: 'task' | 'comment' | 'member' | 'document';
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  score: number;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'mention' | 'assignment' | 'deadline';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  data?: Record<string, any>;
}

export interface AIInsight {
  id: string;
  type: 'suggestion' | 'warning' | 'optimization' | 'prediction';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  action?: () => void;
  actionLabel?: string;
  dismissed: boolean;
  createdAt: number;
}

interface CommandPaletteContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  commands: Command[];
  registerCommand: (command: Command) => void;
  unregisterCommand: (id: string) => void;
  executeCommand: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredCommands: Command[];
  searchResults: SearchResult[];
  isSearching: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

interface AIContextType {
  insights: AIInsight[];
  isAnalyzing: boolean;
  generateInsights: () => Promise<void>;
  dismissInsight: (id: string) => void;
  getTaskSuggestions: (taskTitle: string) => Promise<string[]>;
  getPrioritySuggestion: (task: any) => 'low' | 'medium' | 'high' | 'critical';
  getAssigneeSuggestion: (task: any, members: any[]) => string | null;
  analyzeWorkload: (tasks: any[], members: any[]) => WorkloadAnalysis;
  predictDeadlineRisk: (task: any) => DeadlineRisk;
}

interface WorkloadAnalysis {
  overloadedMembers: Array<{ memberId: string; taskCount: number; recommendation: string }>;
  underutilizedMembers: Array<{ memberId: string; taskCount: number; recommendation: string }>;
  balanceScore: number; // 0-100
  recommendations: string[];
}

interface DeadlineRisk {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  probability: number;
  factors: string[];
  suggestion: string;
}

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
  category: string;
}

interface ShortcutsContextType {
  shortcuts: KeyboardShortcut[];
  registerShortcut: (shortcut: KeyboardShortcut) => void;
  unregisterShortcut: (key: string) => void;
  isShortcutsModalOpen: boolean;
  openShortcutsModal: () => void;
  closeShortcutsModal: () => void;
}

// Navigation types
export type TabId = 'overview' | 'tasks' | 'workload' | 'calendar' | 'comments' | 'team' | 'data';

interface NavigationContextType {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  isCreateTaskOpen: boolean;
  setIsCreateTaskOpen: (open: boolean) => void;
}

// Create contexts
const CommandPaletteContext = createContext<CommandPaletteContextType | undefined>(undefined);
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
const AIContext = createContext<AIContextType | undefined>(undefined);
const ShortcutsContext = createContext<ShortcutsContextType | undefined>(undefined);
const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

// Command Palette Provider
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [commands, setCommands] = useState<Command[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
  }, []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  const registerCommand = useCallback((command: Command) => {
    setCommands(prev => [...prev.filter(c => c.id !== command.id), command]);
  }, []);

  const unregisterCommand = useCallback((id: string) => {
    setCommands(prev => prev.filter(c => c.id !== id));
  }, []);

  const executeCommand = useCallback((id: string) => {
    const command = commands.find(c => c.id === id);
    if (command) {
      command.action();
      close();
    }
  }, [commands, close]);

  // Filter commands based on search query
  const filteredCommands = React.useMemo(() => {
    if (!searchQuery.trim()) return commands;
    
    const query = searchQuery.toLowerCase();
    return commands.filter(cmd => 
      cmd.title.toLowerCase().includes(query) ||
      cmd.description?.toLowerCase().includes(query) ||
      cmd.keywords?.some(k => k.toLowerCase().includes(query)) ||
      cmd.category.toLowerCase().includes(query)
    ).sort((a, b) => {
      // Prioritize exact matches
      const aExact = a.title.toLowerCase().startsWith(query) ? 0 : 1;
      const bExact = b.title.toLowerCase().startsWith(query) ? 0 : 1;
      return aExact - bExact;
    });
  }, [commands, searchQuery]);

  // Global search functionality
  useEffect(() => {
    if (searchQuery.length > 2) {
      setIsSearching(true);
      // Simulate search delay
      const timer = setTimeout(() => {
        // This would typically search through tasks, comments, etc.
        setSearchResults([]);
        setIsSearching(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // Keyboard shortcut to open command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle, close, isOpen]);

  return (
    <CommandPaletteContext.Provider value={{
      isOpen,
      open,
      close,
      toggle,
      commands,
      registerCommand,
      unregisterCommand,
      executeCommand,
      searchQuery,
      setSearchQuery,
      filteredCommands,
      searchResults,
      isSearching,
    }}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

// Notification Provider
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const stored = localStorage.getItem('app_notifications');
    return stored ? JSON.parse(stored) : [];
  });

  // Persist notifications
  useEffect(() => {
    localStorage.setItem('app_notifications', JSON.stringify(notifications.slice(0, 50)));
  }, [notifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev]);
    
    // Browser notification if permitted
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
      });
    }
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      removeNotification,
      clearAll,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

// AI Provider with smart suggestions
export function AIProvider({ children }: { children: ReactNode }) {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const generateInsights = useCallback(async () => {
    setIsAnalyzing(true);
    
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const newInsights: AIInsight[] = [
      {
        id: `insight-${Date.now()}-1`,
        type: 'optimization',
        title: 'Workload Imbalance Detected',
        description: 'Some team members have significantly more tasks than others. Consider redistributing work for better efficiency.',
        confidence: 0.87,
        actionable: true,
        actionLabel: 'View Workload',
        dismissed: false,
        createdAt: Date.now(),
      },
      {
        id: `insight-${Date.now()}-2`,
        type: 'warning',
        title: '3 Tasks at Risk of Missing Deadline',
        description: 'Based on current progress and historical data, these tasks may not be completed on time.',
        confidence: 0.72,
        actionable: true,
        actionLabel: 'Review Tasks',
        dismissed: false,
        createdAt: Date.now(),
      },
      {
        id: `insight-${Date.now()}-3`,
        type: 'suggestion',
        title: 'Consider Breaking Down Large Task',
        description: '"System Architecture Redesign" has been in progress for 5 days. Breaking it into smaller tasks could improve tracking.',
        confidence: 0.65,
        actionable: true,
        actionLabel: 'Split Task',
        dismissed: false,
        createdAt: Date.now(),
      },
    ];
    
    setInsights(newInsights);
    setIsAnalyzing(false);
  }, []);

  const dismissInsight = useCallback((id: string) => {
    setInsights(prev => prev.map(i => i.id === id ? { ...i, dismissed: true } : i));
  }, []);

  const getTaskSuggestions = useCallback(async (taskTitle: string): Promise<string[]> => {
    // Simulate AI suggestions based on task title
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const suggestions: Record<string, string[]> = {
      'api': ['Add API documentation', 'Write integration tests', 'Set up rate limiting'],
      'auth': ['Implement password reset', 'Add 2FA support', 'Set up session management'],
      'ui': ['Add loading states', 'Implement responsive design', 'Add dark mode support'],
      'bug': ['Add error logging', 'Write regression tests', 'Update documentation'],
      'feature': ['Create user story', 'Design mockups', 'Plan implementation phases'],
      'database': ['Add indexes', 'Set up migrations', 'Implement backup strategy'],
    };
    
    const lowerTitle = taskTitle.toLowerCase();
    for (const [keyword, sug] of Object.entries(suggestions)) {
      if (lowerTitle.includes(keyword)) {
        return sug;
      }
    }
    
    return ['Break down into subtasks', 'Add acceptance criteria', 'Estimate time required'];
  }, []);

  const getPrioritySuggestion = useCallback((task: any): 'low' | 'medium' | 'high' | 'critical' => {
    const title = (task.title || '').toLowerCase();
    const description = (task.description || '').toLowerCase();
    const combined = `${title} ${description}`;
    
    if (combined.includes('urgent') || combined.includes('critical') || combined.includes('asap') || combined.includes('emergency')) {
      return 'critical';
    }
    if (combined.includes('important') || combined.includes('blocker') || combined.includes('security')) {
      return 'high';
    }
    if (combined.includes('nice to have') || combined.includes('enhancement') || combined.includes('minor')) {
      return 'low';
    }
    return 'medium';
  }, []);

  const getAssigneeSuggestion = useCallback((task: any, members: any[]): string | null => {
    const title = (task.title || '').toLowerCase();
    const tags = (task.tags || []).map((t: string) => t.toLowerCase());
    
    // Role-based suggestions
    const roleKeywords: Record<string, string[]> = {
      developer: ['implement', 'code', 'fix', 'bug', 'feature', 'api', 'frontend', 'backend'],
      devops: ['deploy', 'infrastructure', 'ci', 'cd', 'pipeline', 'kubernetes', 'docker', 'monitoring'],
      architect: ['design', 'architecture', 'system', 'scalability', 'performance', 'security'],
      product: ['requirement', 'user story', 'acceptance', 'stakeholder', 'roadmap', 'priority'],
    };
    
    for (const [role, keywords] of Object.entries(roleKeywords)) {
      if (keywords.some(k => title.includes(k) || tags.includes(k))) {
        const matchingMember = members.find(m => m.role === role && m.isOnline);
        if (matchingMember) return matchingMember.id;
      }
    }
    
    // Return member with least tasks if no keyword match
    return null;
  }, []);

  const analyzeWorkload = useCallback((tasks: any[], members: any[]): WorkloadAnalysis => {
    const taskCounts: Record<string, number> = {};
    members.forEach(m => { taskCounts[m.id] = 0; });
    
    tasks.filter(t => t.status !== 'done').forEach(task => {
      if (task.assigneeId && taskCounts[task.assigneeId] !== undefined) {
        taskCounts[task.assigneeId]++;
      }
    });
    
    const counts = Object.values(taskCounts);
    const avg = counts.length > 0 ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;
    const max = Math.max(...counts, 0);
    const min = Math.min(...counts, 0);
    
    const overloaded = members
      .filter(m => taskCounts[m.id] > avg * 1.5)
      .map(m => ({
        memberId: m.id,
        taskCount: taskCounts[m.id],
        recommendation: `Consider reassigning ${Math.ceil(taskCounts[m.id] - avg)} tasks to other team members`,
      }));
    
    const underutilized = members
      .filter(m => taskCounts[m.id] < avg * 0.5 && avg > 0)
      .map(m => ({
        memberId: m.id,
        taskCount: taskCounts[m.id],
        recommendation: `Can take on ${Math.ceil(avg - taskCounts[m.id])} more tasks`,
      }));
    
    // Balance score: 100 = perfect balance, 0 = completely unbalanced
    const balanceScore = max > 0 ? Math.round(100 * (1 - (max - min) / max)) : 100;
    
    const recommendations: string[] = [];
    if (overloaded.length > 0) {
      recommendations.push(`${overloaded.length} team member(s) are overloaded with tasks`);
    }
    if (underutilized.length > 0) {
      recommendations.push(`${underutilized.length} team member(s) have capacity for more work`);
    }
    if (balanceScore < 50) {
      recommendations.push('Consider redistributing tasks for better team balance');
    }
    if (balanceScore >= 80) {
      recommendations.push('Workload is well-balanced across the team');
    }
    
    return { overloadedMembers: overloaded, underutilizedMembers: underutilized, balanceScore, recommendations };
  }, []);

  const predictDeadlineRisk = useCallback((task: any): DeadlineRisk => {
    const factors: string[] = [];
    let riskScore = 0;
    
    if (!task.dueDate) {
      return { riskLevel: 'low', probability: 0.1, factors: ['No deadline set'], suggestion: 'Consider setting a deadline for better tracking' };
    }
    
    const now = Date.now();
    const daysUntilDue = (task.dueDate - now) / (1000 * 60 * 60 * 24);
    
    // Time-based risk
    if (daysUntilDue < 0) {
      factors.push('Task is already overdue');
      riskScore += 50;
    } else if (daysUntilDue < 1) {
      factors.push('Due within 24 hours');
      riskScore += 30;
    } else if (daysUntilDue < 3) {
      factors.push('Due within 3 days');
      riskScore += 15;
    }
    
    // Status-based risk
    if (task.status === 'todo') {
      factors.push('Task has not been started');
      riskScore += 20;
    }
    
    // Dependency risk
    if (task.dependencies && task.dependencies.length > 0) {
      factors.push(`Has ${task.dependencies.length} dependencies`);
      riskScore += task.dependencies.length * 5;
    }
    
    // No assignee risk
    if (!task.assigneeId) {
      factors.push('Task is unassigned');
      riskScore += 15;
    }
    
    // Priority escalation
    if (task.priority === 'critical' || task.priority === 'high') {
      factors.push('High priority task');
      riskScore += 10;
    }
    
    const probability = Math.min(riskScore / 100, 0.99);
    
    let riskLevel: DeadlineRisk['riskLevel'];
    let suggestion: string;
    
    if (probability < 0.25) {
      riskLevel = 'low';
      suggestion = 'Task is on track for completion';
    } else if (probability < 0.5) {
      riskLevel = 'medium';
      suggestion = 'Monitor progress closely and address blockers';
    } else if (probability < 0.75) {
      riskLevel = 'high';
      suggestion = 'Consider extending deadline or adding resources';
    } else {
      riskLevel = 'critical';
      suggestion = 'Immediate action required to meet deadline';
    }
    
    return { riskLevel, probability, factors, suggestion };
  }, []);

  return (
    <AIContext.Provider value={{
      insights,
      isAnalyzing,
      generateInsights,
      dismissInsight,
      getTaskSuggestions,
      getPrioritySuggestion,
      getAssigneeSuggestion,
      analyzeWorkload,
      predictDeadlineRisk,
    }}>
      {children}
    </AIContext.Provider>
  );
}

// Keyboard Shortcuts Provider
export function ShortcutsProvider({ children }: { children: ReactNode }) {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const shortcutsRef = useRef<KeyboardShortcut[]>([]);

  // Keep ref in sync
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    setShortcuts(prev => {
      const filtered = prev.filter(s => s.key !== shortcut.key || s.ctrl !== shortcut.ctrl || s.meta !== shortcut.meta);
      return [...filtered, shortcut];
    });
  }, []);

  const unregisterShortcut = useCallback((key: string) => {
    setShortcuts(prev => prev.filter(s => s.key !== key));
  }, []);

  const openShortcutsModal = useCallback(() => setIsShortcutsModalOpen(true), []);
  const closeShortcutsModal = useCallback(() => setIsShortcutsModalOpen(false), []);

  // Global keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const currentShortcuts = shortcutsRef.current;
      
      for (const shortcut of currentShortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = !!shortcut.ctrl === (e.ctrlKey || e.metaKey);
        const altMatch = !!shortcut.alt === e.altKey;
        const shiftMatch = !!shortcut.shift === e.shiftKey;

        if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
          e.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ShortcutsContext.Provider value={{
      shortcuts,
      registerShortcut,
      unregisterShortcut,
      isShortcutsModalOpen,
      openShortcutsModal,
      closeShortcutsModal,
    }}>
      {children}
    </ShortcutsContext.Provider>
  );
}

// Navigation Provider
export function NavigationProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

  return (
    <NavigationContext.Provider value={{
      activeTab,
      setActiveTab,
      isCreateTaskOpen,
      setIsCreateTaskOpen,
    }}>
      {children}
    </NavigationContext.Provider>
  );
}

// Custom hooks
export function useCommandPalette() {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPalette must be used within CommandPaletteProvider');
  }
  return context;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within AIProvider');
  }
  return context;
}

export function useShortcuts() {
  const context = useContext(ShortcutsContext);
  if (!context) {
    throw new Error('useShortcuts must be used within ShortcutsProvider');
  }
  return context;
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}

// Combined Power Features Provider
export function PowerFeaturesProvider({ children }: { children: ReactNode }) {
  return (
    <NavigationProvider>
      <ShortcutsProvider>
        <NotificationProvider>
          <AIProvider>
            <CommandPaletteProvider>
              {children}
            </CommandPaletteProvider>
          </AIProvider>
        </NotificationProvider>
      </ShortcutsProvider>
    </NavigationProvider>
  );
}

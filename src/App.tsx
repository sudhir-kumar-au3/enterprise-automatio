import React, { Suspense, lazy, useEffect } from 'react';
import { CheckSquare, LogOut, User, Settings, Bell, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { AuthProvider, DataProvider, useAuth, PowerFeaturesProvider, useCommandPalette, useShortcuts, useNotifications, useNavigation, SettingsProvider } from '@/contexts';
import { AuthPage } from '@/components/auth';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CommandPalette } from '@/components/CommandPalette';
import { NotificationCenter } from '@/components/NotificationCenter';
import { AIInsightsPanel } from '@/components/AIInsightsPanel';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import { SettingsDialog } from '@/components/SettingsDialog';

// Lazy load the main collaboration view for better initial load
const CollaborationView = lazy(() => import('@/components/CollaborationView'));

// Loading skeleton for the main content
function ContentSkeleton() {
  return (
    <div className="space-y-6 fade-in">
      {/* Stats skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-6">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      {/* Main content skeleton */}
      <div className="rounded-xl border bg-card p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Modern header component
function AppHeader() {
  const { user, logout } = useAuth();
  const { open: openCommandPalette, registerCommand } = useCommandPalette();
  const { openShortcutsModal, registerShortcut } = useShortcuts();
  const { addNotification } = useNotifications();
  const { setActiveTab, setIsCreateTaskOpen } = useNavigation();

  const initials = user?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  // Register commands
  useEffect(() => {
    registerCommand({
      id: 'open-settings',
      title: 'Open Settings',
      description: 'Configure your preferences',
      category: 'settings',
      shortcut: ['⌘', ','],
      action: () => {
        // Settings dialog handles its own open state
        document.querySelector<HTMLButtonElement>('[data-settings-trigger]')?.click();
      },
    });

    registerCommand({
      id: 'toggle-theme',
      title: 'Toggle Theme',
      description: 'Switch between light and dark mode',
      category: 'settings',
      shortcut: ['⌘', 'D'],
      action: () => {
        document.documentElement.classList.toggle('dark');
      },
    });

    registerCommand({
      id: 'show-shortcuts',
      title: 'Keyboard Shortcuts',
      description: 'View all keyboard shortcuts',
      category: 'settings',
      shortcut: ['⌘', '/'],
      action: openShortcutsModal,
    });

    registerCommand({
      id: 'go-home',
      title: 'Go to Overview',
      description: 'Navigate to the overview tab',
      category: 'navigation',
      shortcut: ['G', 'H'],
      action: () => {
        setActiveTab('overview');
      },
    });

    registerCommand({
      id: 'go-tasks',
      title: 'Go to Tasks',
      description: 'Navigate to the tasks tab',
      category: 'navigation',
      shortcut: ['G', 'T'],
      action: () => {
        setActiveTab('tasks');
      },
    });

    registerCommand({
      id: 'go-workload',
      title: 'Go to Workload',
      description: 'Navigate to the workload tab',
      category: 'navigation',
      shortcut: ['G', 'W'],
      action: () => {
        setActiveTab('workload');
      },
    });

    registerCommand({
      id: 'go-calendar',
      title: 'Go to Calendar',
      description: 'Navigate to the calendar tab',
      category: 'navigation',
      shortcut: ['G', 'C'],
      action: () => {
        setActiveTab('calendar');
      },
    });

    registerCommand({
      id: 'go-comments',
      title: 'Go to Comments',
      description: 'Navigate to the comments tab',
      category: 'navigation',
      shortcut: ['G', 'M'],
      action: () => {
        setActiveTab('comments');
      },
    });

    registerCommand({
      id: 'go-team',
      title: 'Go to Team',
      description: 'Navigate to the team tab',
      category: 'navigation',
      shortcut: ['G', 'E'],
      action: () => {
        setActiveTab('team');
      },
    });

    registerCommand({
      id: 'new-task',
      title: 'Create New Task',
      description: 'Create a new task',
      category: 'actions',
      shortcut: ['N'],
      action: () => {
        setActiveTab('tasks');
        setIsCreateTaskOpen(true);
      },
    });

    registerCommand({
      id: 'ai-insights',
      title: 'AI Insights',
      description: 'View AI-powered insights and suggestions',
      category: 'ai',
      shortcut: ['⌘', 'I'],
      action: () => {
        document.querySelector<HTMLButtonElement>('[data-ai-trigger]')?.click();
      },
    });

    registerCommand({
      id: 'sign-out',
      title: 'Sign Out',
      description: 'Sign out of your account',
      category: 'actions',
      action: logout,
    });
  }, [registerCommand, openShortcutsModal, logout, setActiveTab, setIsCreateTaskOpen]);

  // Register keyboard shortcuts
  useEffect(() => {
    registerShortcut({
      key: '/',
      meta: true,
      action: openShortcutsModal,
      description: 'Show keyboard shortcuts',
      category: 'General',
    });

    registerShortcut({
      key: 'd',
      meta: true,
      action: () => document.documentElement.classList.toggle('dark'),
      description: 'Toggle dark mode',
      category: 'General',
    });

    registerShortcut({
      key: 'i',
      meta: true,
      action: () => document.querySelector<HTMLButtonElement>('[data-ai-trigger]')?.click(),
      description: 'Open AI insights',
      category: 'General',
    });
  }, [registerShortcut, openShortcutsModal]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold tracking-tight">Team Hub</h1>
            <p className="text-xs text-muted-foreground">Enterprise Collaboration</p>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1">
          {/* Command Palette Trigger */}
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:flex items-center gap-2 text-muted-foreground hover:text-foreground"
            onClick={openCommandPalette}
          >
            <span className="text-sm">Search...</span>
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          {/* AI Insights */}
          <AIInsightsPanel />

          {/* Notifications */}
          <NotificationCenter />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Settings */}
          <SettingsDialog
            trigger={
              <Button variant="ghost" size="icon" className="h-9 w-9" data-settings-trigger>
                <Settings className="h-[1.2rem] w-[1.2rem]" />
              </Button>
            }
          />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onSelect={() => document.querySelector<HTMLButtonElement>('[data-settings-trigger]')?.click()}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onSelect={openShortcutsModal}>
                <Keyboard className="mr-2 h-4 w-4" />
                <span>Keyboard shortcuts</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Global Components */}
      <CommandPalette />
      <KeyboardShortcutsModal />
    </header>
  );
}

// App loading state
function AppLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 animate-pulse">
        <CheckSquare className="h-7 w-7" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="h-1.5 w-32 rounded-full bg-muted overflow-hidden">
          <div className="h-full w-1/2 bg-primary rounded-full animate-[shimmer_1s_ease-in-out_infinite]" 
               style={{ animation: 'loading 1s ease-in-out infinite' }} />
        </div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}

function AppContent() {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading spinner while checking auth state
  if (isLoading) {
    return <AppLoading />;
  }

  // Show auth page if not authenticated
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <main className="container px-4 md:px-6 py-6 md:py-8">
        <Suspense fallback={<ContentSkeleton />}>
          <div className="fade-in">
            <CollaborationView />
          </div>
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-14 md:flex-row px-4 md:px-6">
          <p className="text-center text-sm text-muted-foreground md:text-left">
            © 2026 Team Hub. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <DataProvider>
          <PowerFeaturesProvider>
            <AppContent />
          </PowerFeaturesProvider>
        </DataProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
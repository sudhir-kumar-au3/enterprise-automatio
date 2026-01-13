import React, { Suspense, lazy, useEffect } from 'react';
import { CheckSquare, LogOut, User, Settings, Bell, Keyboard, Sparkles } from 'lucide-react';
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
          <div key={i} className="rounded-xl border bg-card p-6 shadow-sm">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      {/* Main content skeleton */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <Skeleton className="h-6 w-48 mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-9 w-24 rounded-lg" />
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
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base font-semibold tracking-tight">Pulsework.io</h1>
            <p className="text-xs text-muted-foreground">Enterprise Collaboration</p>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1.5">
          {/* Command Palette Trigger */}
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex items-center gap-2 text-muted-foreground hover:text-foreground h-9 px-3 bg-muted/30"
            onClick={openCommandPalette}
          >
            <span className="text-sm">Search...</span>
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded-md border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
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
              <Button variant="ghost" size="icon-sm" className="h-9 w-9" data-settings-trigger>
                <Settings className="h-[1.15rem] w-[1.15rem]" />
              </Button>
            }
          />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full ml-1">
                <Avatar className="h-9 w-9 ring-2 ring-border">
                  <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1.5">
                  <p className="text-sm font-semibold leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer gap-2">
                <User className="h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onSelect={() => document.querySelector<HTMLButtonElement>('[data-settings-trigger]')?.click()}>
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onSelect={openShortcutsModal}>
                <Keyboard className="h-4 w-4" />
                <span>Keyboard shortcuts</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer text-destructive focus:text-destructive gap-2"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
      <div className="relative">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xl shadow-primary/30">
          <CheckSquare className="h-8 w-8" />
        </div>
        <div className="absolute -inset-4 rounded-3xl bg-primary/10 animate-pulse" />
      </div>
      <div className="flex flex-col items-center gap-3">
        <div className="h-1.5 w-40 rounded-full bg-muted overflow-hidden">
          <div className="h-full w-1/3 bg-gradient-to-r from-primary to-primary/60 rounded-full" 
               style={{ animation: 'loading 1.5s ease-in-out infinite' }} />
        </div>
        <p className="text-sm text-muted-foreground font-medium">Loading your workspace...</p>
      </div>
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-150%); }
          50% { transform: translateX(250%); }
          100% { transform: translateX(-150%); }
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
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      
      <main className="flex-1 container px-4 md:px-6 py-8">
        <Suspense fallback={<ContentSkeleton />}>
          <div className="fade-in">
            <CollaborationView />
          </div>
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container flex flex-col items-center justify-between gap-4 py-6 md:h-16 md:flex-row md:py-0 px-4 md:px-6">
          <p className="text-center text-sm text-muted-foreground md:text-left">
            © 2026 Pulsework.io. Built with precision.
          </p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors duration-200">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors duration-200">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors duration-200">Support</a>
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
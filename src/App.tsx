import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Activity, LogOut, User, Settings, Bell, Keyboard, Sparkles, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { AuthProvider, DataProvider, useAuth, PowerFeaturesProvider, useCommandPalette, useShortcuts, useNotifications, useNavigation, SettingsProvider, OrganizationProvider, useOrganization } from '@/contexts';
import { AuthPage, TermsOfService, PrivacyPolicy, OrganizationSignup } from '@/components/auth';
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

// Modern header component - updated to show organization branding
function AppHeader() {
  const { user, logout } = useAuth();
  const { organization } = useOrganization();
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

  // Use organization branding if available
  const brandName = organization?.branding?.companyName || 'Pulsework.io';
  const brandTagline = organization?.branding?.tagline || 'Your team\'s rhythm';

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
        {/* Logo & Brand - Updated to use organization branding */}
        <div className="flex items-center gap-2.5">
          {organization?.branding?.logo ? (
            <img 
              src={organization.branding.logo} 
              alt={brandName} 
              className="h-10 w-10 rounded-xl object-contain"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Activity className="h-5 w-5" />
            </div>
          )}
          <div className="hidden sm:flex flex-col justify-center h-10">
            <span className="text-lg font-bold leading-tight">{brandName}</span>
            <span className="text-[10px] text-muted-foreground leading-tight">{brandTagline}</span>
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

// Support Page component
function SupportPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={onBack} className="mb-6 gap-2">
          <Activity className="h-4 w-4" />
          Back to App
        </Button>
        
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Support Center</h1>
            <p className="text-muted-foreground">We're here to help you get the most out of Pulsework.io</p>
          </div>

          {/* Contact Options */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-6 rounded-xl border bg-card hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2">Email Support</h3>
              <p className="text-sm text-muted-foreground mb-3">Get help via email within 24 hours</p>
              <a href="mailto:support@pulsework.io" className="text-sm text-primary hover:underline">
                support@pulsework.io
              </a>
            </div>

            <div className="p-6 rounded-xl border bg-card hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2">Live Chat</h3>
              <p className="text-sm text-muted-foreground mb-3">Chat with our team in real-time</p>
              <span className="text-sm text-muted-foreground">Available Mon-Fri, 9am-6pm EST</span>
            </div>

            <div className="p-6 rounded-xl border bg-card hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2">Documentation</h3>
              <p className="text-sm text-muted-foreground mb-3">Browse our guides and tutorials</p>
              <span className="text-sm text-primary hover:underline cursor-pointer">View Docs →</span>
            </div>
          </div>

          {/* FAQ Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {[
                {
                  q: "How do I reset my password?",
                  a: "Click 'Forgot password?' on the login page and enter your email. You'll receive a reset link within minutes."
                },
                {
                  q: "Can I invite team members to my workspace?",
                  a: "Yes! Go to the Team tab and click 'Invite Member'. You can invite users by email and assign them roles."
                },
                {
                  q: "How do I export my tasks?",
                  a: "Navigate to the Tasks view, click the export button, and choose your preferred format (CSV, JSON, or PDF)."
                },
                {
                  q: "Is my data secure?",
                  a: "Absolutely. We use AES-256 encryption for data at rest and TLS 1.3 for data in transit. Read our Privacy Policy for more details."
                },
                {
                  q: "What browsers are supported?",
                  a: "Pulsework.io works best on the latest versions of Chrome, Firefox, Safari, and Edge."
                },
                {
                  q: "How do I cancel my subscription?",
                  a: "Go to Settings > Billing > Cancel Subscription. Your data will be retained for 30 days after cancellation."
                }
              ].map((faq, i) => (
                <div key={i} className="p-4 rounded-xl border bg-card">
                  <h4 className="font-medium mb-2">{faq.q}</h4>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* System Status */}
          <div className="p-6 rounded-xl border bg-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">System Status</h2>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">All Systems Operational</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">API</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Web App</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Database</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Real-time</span>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="p-6 rounded-xl border bg-card">
            <h2 className="text-xl font-semibold mb-4">Send us a message</h2>
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Name</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Email</label>
                  <input 
                    type="email" 
                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Subject</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="How can we help?"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Message</label>
                <textarea 
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  placeholder="Describe your issue or question..."
                />
              </div>
              <Button className="w-full md:w-auto">Send Message</Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// App loading state
function AppLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
      <div className="relative">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xl shadow-primary/30">
          <Activity className="h-8 w-8" />
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
  const { organization, fetchOrganization } = useOrganization();
  const [showPage, setShowPage] = useState<'main' | 'privacy' | 'terms' | 'support' | 'org-signup'>('main');

  // Fetch organization data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchOrganization();
    }
  }, [isAuthenticated, fetchOrganization]);

  // Show loading spinner while checking auth state
  if (isLoading) {
    return <AppLoading />;
  }

  // Show organization signup page
  if (showPage === 'org-signup') {
    return (
      <OrganizationSignup 
        onSuccess={() => setShowPage('main')}
        onBackToLogin={() => setShowPage('main')}
      />
    );
  }

  // Show auth page if not authenticated
  if (!isAuthenticated) {
    return <AuthPage onCreateOrganization={() => setShowPage('org-signup')} />;
  }

  // Show Privacy Policy page
  if (showPage === 'privacy') {
    return <PrivacyPolicy onBack={() => setShowPage('main')} />;
  }

  // Show Terms of Service page
  if (showPage === 'terms') {
    return <TermsOfService onBack={() => setShowPage('main')} />;
  }

  // Show Support page
  if (showPage === 'support') {
    return <SupportPage onBack={() => setShowPage('main')} />;
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

      {/* Footer - Updated to use organization legal links */}
      <footer className="border-t bg-muted/30">
        <div className="container flex flex-col items-center justify-between gap-4 py-6 md:h-16 md:flex-row md:py-0 px-4 md:px-6">
          <p className="text-center text-sm text-muted-foreground md:text-left">
            © 2026 {organization?.branding?.companyName || 'Pulsework.io'}. Built with precision.
          </p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            {organization?.legal?.privacyPolicyUrl ? (
              <a href={organization.legal.privacyPolicyUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors duration-200">
                Privacy
              </a>
            ) : (
              <button onClick={() => setShowPage('privacy')} className="hover:text-foreground transition-colors duration-200">
                Privacy
              </button>
            )}
            {organization?.legal?.termsOfServiceUrl ? (
              <a href={organization.legal.termsOfServiceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors duration-200">
                Terms
              </a>
            ) : (
              <button onClick={() => setShowPage('terms')} className="hover:text-foreground transition-colors duration-200">
                Terms
              </button>
            )}
            <button onClick={() => setShowPage('support')} className="hover:text-foreground transition-colors duration-200">
              Support
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <OrganizationProvider>
        <SettingsProvider>
          <DataProvider>
            <PowerFeaturesProvider>
              <AppContent />
            </PowerFeaturesProvider>
          </DataProvider>
        </SettingsProvider>
      </OrganizationProvider>
    </AuthProvider>
  );
}

export default App;
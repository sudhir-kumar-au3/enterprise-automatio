import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useShortcuts } from '@/contexts/PowerFeaturesContext';
import { Keyboard, Command, Search, Plus, Settings, Moon, ArrowUp, ArrowDown, Sparkles, Bell, Calendar, Users, BarChart3 } from 'lucide-react';

const defaultShortcuts = [
  { category: 'General', icon: Command, shortcuts: [
    { keys: ['⌘', 'K'], description: 'Open command palette' },
    { keys: ['⌘', 'F'], description: 'Global search' },
    { keys: ['⌘', '/'], description: 'Show keyboard shortcuts' },
    { keys: ['⌘', 'S'], description: 'Save changes' },
    { keys: ['Esc'], description: 'Close modal / Cancel' },
  ]},
  { category: 'Navigation', icon: ArrowUp, shortcuts: [
    { keys: ['G', 'H'], description: 'Go to home / Overview' },
    { keys: ['G', 'T'], description: 'Go to tasks' },
    { keys: ['G', 'W'], description: 'Go to workload' },
    { keys: ['G', 'C'], description: 'Go to calendar' },
    { keys: ['G', 'M'], description: 'Go to comments' },
    { keys: ['G', 'E'], description: 'Go to team' },
    { keys: ['G', 'A'], description: 'Go to analytics' },
    { keys: ['G', 'S'], description: 'Go to settings' },
  ]},
  { category: 'Tasks', icon: Plus, shortcuts: [
    { keys: ['N'], description: 'Create new task' },
    { keys: ['E'], description: 'Edit selected task' },
    { keys: ['D'], description: 'Delete selected task' },
    { keys: ['⌘', 'Enter'], description: 'Save task' },
    { keys: ['↑', '↓'], description: 'Navigate tasks' },
    { keys: ['Space'], description: 'Toggle task status' },
    { keys: ['P'], description: 'Change priority' },
    { keys: ['A'], description: 'Assign task' },
  ]},
  { category: 'Views', icon: BarChart3, shortcuts: [
    { keys: ['1'], description: 'List view' },
    { keys: ['2'], description: 'Board view' },
    { keys: ['3'], description: 'Calendar view' },
    { keys: ['⌘', 'B'], description: 'Toggle sidebar' },
    { keys: ['⌘', 'D'], description: 'Toggle dark mode' },
    { keys: ['⌘', '\\'], description: 'Toggle compact mode' },
  ]},
  { category: 'AI & Insights', icon: Sparkles, shortcuts: [
    { keys: ['⌘', 'I'], description: 'Open AI insights panel' },
    { keys: ['⌘', 'J'], description: 'Get AI suggestions' },
    { keys: ['⌘', 'L'], description: 'Analyze workload' },
  ]},
  { category: 'Collaboration', icon: Users, shortcuts: [
    { keys: ['@'], description: 'Mention team member' },
    { keys: ['⌘', 'M'], description: 'Open notifications' },
    { keys: ['C'], description: 'Add comment' },
    { keys: ['R'], description: 'Reply to comment' },
  ]},
  { category: 'Quick Actions', icon: Settings, shortcuts: [
    { keys: ['⌘', 'Z'], description: 'Undo' },
    { keys: ['⌘', '⇧', 'Z'], description: 'Redo' },
    { keys: ['⌘', 'C'], description: 'Copy' },
    { keys: ['⌘', 'V'], description: 'Paste' },
    { keys: ['⌘', ','], description: 'Open settings' },
    { keys: ['?'], description: 'Show help' },
  ]},
];

export function KeyboardShortcutsModal() {
  const { isShortcutsModalOpen, closeShortcutsModal } = useShortcuts();

  return (
    <Dialog open={isShortcutsModalOpen} onOpenChange={(open) => !open && closeShortcutsModal()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate and perform actions quickly
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {defaultShortcuts.map((group, groupIndex) => {
              const Icon = group.icon;
              return (
                <div key={group.category}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {group.category}
                  </h3>
                  <div className="grid gap-2">
                    {group.shortcuts.map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-sm">{shortcut.description}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, keyIndex) => (
                            <React.Fragment key={keyIndex}>
                              <kbd className="px-2 py-1 text-xs font-medium bg-muted rounded border shadow-sm min-w-[24px] text-center">
                                {key}
                              </kbd>
                              {keyIndex < shortcut.keys.length - 1 && (
                                <span className="text-muted-foreground text-xs">+</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {groupIndex < defaultShortcuts.length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="pt-4 border-t space-y-2">
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">⌘</kbd> + <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">/</kbd> anytime to show this dialog
          </p>
          <p className="text-xs text-muted-foreground text-center">
            <Badge variant="secondary" className="text-xs">Pro tip</Badge> Use <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">⌘</kbd> + <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">K</kbd> to quickly search and run commands
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default KeyboardShortcutsModal;

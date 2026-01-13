import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Dialog, DialogContent } from './dialog';
import { Input } from './input';
import { Badge } from './badge';
import { ScrollArea } from './scroll-area';
import { cn } from '@/lib/utils';
import { useCommandPalette, Command } from '@/contexts/PowerFeaturesContext';
import {
  Search,
  Command as CommandIcon,
  ArrowRight,
  Sparkles,
  Settings,
  Users,
  CheckSquare,
  Calendar,
  BarChart3,
  FileText,
  Zap,
  Moon,
  Sun,
  LogOut,
  Plus,
  Home,
  MessageSquare,
  Clock,
  Target,
  Layers,
  GitBranch
} from 'lucide-react';

const categoryIcons: Record<string, React.ReactNode> = {
  navigation: <Home className="h-4 w-4" />,
  actions: <Zap className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
  search: <Search className="h-4 w-4" />,
  ai: <Sparkles className="h-4 w-4" />,
};

const categoryColors: Record<string, string> = {
  navigation: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  actions: 'bg-green-500/10 text-green-600 border-green-500/20',
  settings: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  search: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  ai: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
};

export function CommandPalette() {
  const {
    isOpen,
    close,
    searchQuery,
    setSearchQuery,
    filteredCommands,
    executeCommand,
    isSearching,
  } = useCommandPalette();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset selection when filtered commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            executeCommand(filteredCommands[selectedIndex].id);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, executeCommand]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    selectedElement?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    filteredCommands.forEach(cmd => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  let globalIndex = -1;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="p-0 gap-0 max-w-2xl overflow-hidden bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <Input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="border-0 shadow-none focus-visible:ring-0 px-0 text-base placeholder:text-muted-foreground/60"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground bg-muted rounded border">
            <span className="text-xs">ESC</span>
          </kbd>
        </div>

        {/* Commands List */}
        <ScrollArea className="max-h-[400px]" ref={listRef}>
          <div className="p-2">
            {filteredCommands.length === 0 ? (
              <div className="py-12 text-center">
                <CommandIcon className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No commands found' : 'Start typing to search...'}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Try searching for "create", "settings", or "navigate"
                </p>
              </div>
            ) : (
              Object.entries(groupedCommands).map(([category, commands]) => (
                <div key={category} className="mb-3 last:mb-0">
                  <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
                    {categoryIcons[category]}
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {category}
                    </span>
                    <Badge variant="secondary" className="text-xs ml-auto">
                      {commands.length}
                    </Badge>
                  </div>
                  <div className="space-y-0.5">
                    {commands.map((command) => {
                      globalIndex++;
                      const isSelected = globalIndex === selectedIndex;
                      const currentIndex = globalIndex;

                      return (
                        <button
                          key={command.id}
                          data-index={currentIndex}
                          onClick={() => executeCommand(command.id)}
                          onMouseEnter={() => setSelectedIndex(currentIndex)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                            isSelected 
                              ? "bg-primary text-primary-foreground" 
                              : "hover:bg-muted/80"
                          )}
                        >
                          <div className={cn(
                            "flex items-center justify-center h-8 w-8 rounded-md flex-shrink-0",
                            isSelected ? "bg-primary-foreground/20" : categoryColors[command.category]
                          )}>
                            {command.icon || categoryIcons[command.category]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "font-medium text-sm truncate",
                              isSelected ? "text-primary-foreground" : ""
                            )}>
                              {command.title}
                            </p>
                            {command.description && (
                              <p className={cn(
                                "text-xs truncate",
                                isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                              )}>
                                {command.description}
                              </p>
                            )}
                          </div>
                          {command.shortcut && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {command.shortcut.map((key, i) => (
                                <kbd
                                  key={i}
                                  className={cn(
                                    "px-1.5 py-0.5 text-xs font-medium rounded",
                                    isSelected 
                                      ? "bg-primary-foreground/20 text-primary-foreground" 
                                      : "bg-muted text-muted-foreground"
                                  )}
                                >
                                  {key}
                                </kbd>
                              ))}
                            </div>
                          )}
                          <ArrowRight className={cn(
                            "h-4 w-4 flex-shrink-0 transition-transform",
                            isSelected ? "text-primary-foreground translate-x-0.5" : "text-muted-foreground/50"
                          )} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
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
              <span>Select</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded">ESC</kbd>
              <span>Close</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>AI-Powered</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CommandPalette;

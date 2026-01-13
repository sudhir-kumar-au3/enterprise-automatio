import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useCommandPalette, Command } from '@/contexts/PowerFeaturesContext';
import { 
  Search, 
  Command as CommandIcon, 
  ArrowRight, 
  Home, 
  ListTodo, 
  Calendar, 
  BarChart3, 
  Settings, 
  Plus, 
  Moon, 
  Sun, 
  Users, 
  Bell,
  Sparkles,
  FileText,
  Keyboard,
  LogOut,
  HelpCircle,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

const categoryIcons: Record<string, React.ReactNode> = {
  navigation: <ArrowRight className="h-4 w-4" />,
  actions: <Zap className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
  search: <Search className="h-4 w-4" />,
  ai: <Sparkles className="h-4 w-4" />,
};

const categoryColors: Record<string, string> = {
  navigation: 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/20',
  actions: 'bg-green-500/10 text-green-500 dark:bg-green-500/20',
  settings: 'bg-slate-500/10 text-slate-500 dark:bg-slate-500/20 dark:text-slate-400',
  search: 'bg-purple-500/10 text-purple-500 dark:bg-purple-500/20',
  ai: 'bg-amber-500/10 text-amber-500 dark:bg-amber-500/20',
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
    searchResults 
  } = useCommandPalette();
  
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset selection when commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [isOpen, selectedIndex, filteredCommands, executeCommand]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = [];
    }
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  const categoryOrder = ['navigation', 'actions', 'ai', 'settings', 'search'];
  const sortedCategories = Object.keys(groupedCommands).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  );

  let globalIndex = 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center border-b px-4 py-3">
          <CommandIcon className="h-5 w-5 text-muted-foreground mr-3" />
          <Input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 text-base placeholder:text-muted-foreground/60"
          />
          {isSearching && (
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          )}
        </div>

        {/* Commands List */}
        <ScrollArea className="max-h-[400px]">
          <div ref={listRef} className="py-2">
            {filteredCommands.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="text-sm">No commands found</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </div>
            ) : (
              sortedCategories.map((category) => (
                <div key={category} className="mb-2">
                  <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    {categoryIcons[category]}
                    {category}
                  </div>
                  {groupedCommands[category].map((command) => {
                    const currentIndex = globalIndex++;
                    const isSelected = currentIndex === selectedIndex;
                    
                    return (
                      <button
                        key={command.id}
                        data-index={currentIndex}
                        onClick={() => executeCommand(command.id)}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                          isSelected 
                            ? "bg-accent text-accent-foreground" 
                            : "hover:bg-accent/50"
                        )}
                      >
                        <div className={cn(
                          "p-1.5 rounded-md",
                          categoryColors[command.category]
                        )}>
                          {command.icon || categoryIcons[command.category]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {command.title}
                          </div>
                          {command.description && (
                            <div className="text-xs text-muted-foreground truncate">
                              {command.description}
                            </div>
                          )}
                        </div>
                        {command.shortcut && (
                          <div className="flex items-center gap-1">
                            {command.shortcut.map((key, i) => (
                              <React.Fragment key={i}>
                                <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border font-mono">
                                  {key}
                                </kbd>
                                {i < command.shortcut!.length - 1 && (
                                  <span className="text-muted-foreground text-xs">+</span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}

            {/* Search Results Section */}
            {searchResults.length > 0 && (
              <div className="border-t mt-2 pt-2">
                <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Search Results
                </div>
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/50 transition-colors"
                  >
                    <Badge variant="outline" className="text-xs">
                      {result.type}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {result.title}
                      </div>
                      {result.description && (
                        <div className="text-xs text-muted-foreground truncate">
                          {result.description}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t px-4 py-2 flex items-center justify-between text-xs text-muted-foreground bg-muted/30">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-background rounded border text-[10px]">↑</kbd>
              <kbd className="px-1 py-0.5 bg-background rounded border text-[10px]">↓</kbd>
              <span>to navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background rounded border text-[10px]">↵</kbd>
              <span>to select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background rounded border text-[10px]">esc</kbd>
              <span>to close</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            <span>AI-powered search</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CommandPalette;

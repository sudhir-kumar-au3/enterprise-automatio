import { CheckSquare, Moon, Sun } from '@phosphor-icons/react'
import CollaborationView from '@/components/CollaborationView'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/use-theme'

function App() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-foreground rounded-md flex items-center justify-center">
                <CheckSquare size={20} weight="bold" className="text-background" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                  Team Hub
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Task management & collaboration
                </p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9"
            >
              {theme === 'light' ? (
                <Moon size={18} weight="regular" />
              ) : (
                <Sun size={18} weight="regular" />
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CollaborationView />
      </main>
    </div>
  )
}

export default App
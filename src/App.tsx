import { Users, Moon, Sun } from '@phosphor-icons/react'
import CollaborationView from '@/components/CollaborationView'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/use-theme'
import { motion } from 'framer-motion'

function App() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <header className="border-b border-border bg-card/80 sticky top-0 z-50 backdrop-blur-lg shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <motion.div 
                className="p-2.5 bg-gradient-to-br from-primary to-accent rounded-xl shadow-lg"
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <Users size={28} weight="duotone" className="text-white" />
              </motion.div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Team Collaboration Hub
                </h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Coordinate tasks, share feedback, and manage your team
                </p>
              </div>
            </div>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="outline"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full h-10 w-10 shadow-md hover:shadow-lg transition-all"
              >
                {theme === 'light' ? (
                  <Moon size={20} weight="duotone" className="text-primary" />
                ) : (
                  <Sun size={20} weight="duotone" className="text-accent" />
                )}
              </Button>
            </motion.div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <CollaborationView />
      </main>
    </div>
  )
}

export default App
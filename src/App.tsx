import { Users } from '@phosphor-icons/react'
import CollaborationView from '@/components/CollaborationView'

function App() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-accent rounded-lg">
              <Users size={24} weight="duotone" className="text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Team Collaboration Hub</h1>
              <p className="text-sm text-muted-foreground">Coordinate tasks, share feedback, and manage your team</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <CollaborationView />
      </main>
    </div>
  )
}

export default App
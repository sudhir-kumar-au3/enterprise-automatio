import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CirclesThree, Database, FlowArrow, Stack, Calendar, ShieldCheck, Users } from '@phosphor-icons/react'
import ArchitectureView from '@/components/ArchitectureView'
import ServicesView from '@/components/ServicesView'
import WorkflowsView from '@/components/WorkflowsView'
import TechStackView from '@/components/TechStackView'
import RoadmapView from '@/components/RoadmapView'
import SecurityView from '@/components/SecurityView'
import CollaborationView from '@/components/CollaborationView'

function App() {
  const [activeTab, setActiveTab] = useState('architecture')

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-accent rounded-lg">
              <CirclesThree size={24} weight="duotone" className="text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Enterprise Automation Architecture</h1>
              <p className="text-sm text-muted-foreground">End-to-end system design for LMS, ERP & DevOps automation</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 lg:grid-cols-7 w-full bg-muted/50 p-1">
            <TabsTrigger value="architecture" className="gap-2">
              <CirclesThree size={18} />
              <span className="hidden sm:inline">Architecture</span>
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-2">
              <Database size={18} />
              <span className="hidden sm:inline">Services</span>
            </TabsTrigger>
            <TabsTrigger value="workflows" className="gap-2">
              <FlowArrow size={18} />
              <span className="hidden sm:inline">Workflows</span>
            </TabsTrigger>
            <TabsTrigger value="tech-stack" className="gap-2">
              <Stack size={18} />
              <span className="hidden sm:inline">Tech Stack</span>
            </TabsTrigger>
            <TabsTrigger value="roadmap" className="gap-2">
              <Calendar size={18} />
              <span className="hidden sm:inline">Roadmap</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <ShieldCheck size={18} />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="collaboration" className="gap-2">
              <Users size={18} />
              <span className="hidden sm:inline">Team</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="architecture" className="space-y-6">
            <ArchitectureView />
          </TabsContent>

          <TabsContent value="services" className="space-y-6">
            <ServicesView />
          </TabsContent>

          <TabsContent value="workflows" className="space-y-6">
            <WorkflowsView />
          </TabsContent>

          <TabsContent value="tech-stack" className="space-y-6">
            <TechStackView />
          </TabsContent>

          <TabsContent value="roadmap" className="space-y-6">
            <RoadmapView />
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <SecurityView />
          </TabsContent>

          <TabsContent value="collaboration" className="space-y-6">
            <CollaborationView />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default App
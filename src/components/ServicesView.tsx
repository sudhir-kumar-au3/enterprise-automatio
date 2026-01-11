import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { services, Service } from '@/lib/architecture-data'
import { Database, CirclesThree, GitBranch, Bell, Lock } from '@phosphor-icons/react'

const categoryIcons = {
  lms: Database,
  erp: CirclesThree,
  devops: GitBranch,
  communication: Bell,
  core: Lock
}

const statusColors = {
  deployed: 'bg-green-500/10 text-green-700 border-green-500/20',
  'in-progress': 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
  planned: 'bg-blue-500/10 text-blue-700 border-blue-500/20'
}

const ServicesView = () => {
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [filter, setFilter] = useState<string>('all')

  const filteredServices = filter === 'all' 
    ? services 
    : services.filter(s => s.category === filter)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Service Catalog</h2>
        <p className="text-muted-foreground text-lg">
          Detailed specifications for all microservices in the automation platform
        </p>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full">
          <TabsTrigger value="all">All ({services.length})</TabsTrigger>
          <TabsTrigger value="core">Core ({services.filter(s => s.category === 'core').length})</TabsTrigger>
          <TabsTrigger value="lms">LMS ({services.filter(s => s.category === 'lms').length})</TabsTrigger>
          <TabsTrigger value="erp">ERP ({services.filter(s => s.category === 'erp').length})</TabsTrigger>
          <TabsTrigger value="devops">DevOps ({services.filter(s => s.category === 'devops').length})</TabsTrigger>
          <TabsTrigger value="communication">Comms ({services.filter(s => s.category === 'communication').length})</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map(service => {
              const Icon = categoryIcons[service.category]
              return (
                <Card 
                  key={service.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedService(service)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Icon size={24} weight="duotone" className="text-accent shrink-0" />
                      <Badge variant="outline" className={statusColors[service.status]}>
                        {service.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    <CardDescription className="line-clamp-2">{service.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Tech Stack</p>
                        <div className="flex flex-wrap gap-1">
                          {service.techStack.slice(0, 3).map(tech => (
                            <Badge key={tech} variant="secondary" className="text-xs font-mono">
                              {tech}
                            </Badge>
                          ))}
                          {service.techStack.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{service.techStack.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="w-full mt-2">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedService} onOpenChange={() => setSelectedService(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedService && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <DialogTitle className="text-2xl">{selectedService.name}</DialogTitle>
                  <Badge variant="outline" className={statusColors[selectedService.status]}>
                    {selectedService.status}
                  </Badge>
                </div>
                <DialogDescription className="text-base">
                  {selectedService.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                <div>
                  <h4 className="font-semibold mb-2">Tech Stack</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedService.techStack.map(tech => (
                      <Badge key={tech} variant="secondary" className="font-mono">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>

                {selectedService.endpoints && selectedService.endpoints.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">API Endpoints</h4>
                    <div className="bg-muted p-4 rounded-lg space-y-1">
                      {selectedService.endpoints.map(endpoint => (
                        <code key={endpoint} className="block text-sm font-mono">
                          {endpoint}
                        </code>
                      ))}
                    </div>
                  </div>
                )}

                {selectedService.databases && selectedService.databases.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Databases</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedService.databases.map(db => (
                        <Badge key={db} variant="outline" className="font-mono">
                          {db}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold mb-2">Cloud Services</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedService.cloudServices.map(cloud => (
                      <Badge key={cloud} variant="outline">
                        {cloud}
                      </Badge>
                    ))}
                  </div>
                </div>

                {selectedService.dependencies.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Dependencies</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedService.dependencies.map(dep => {
                        const depService = services.find(s => s.id === dep)
                        return (
                          <Badge key={dep} variant="outline" className="cursor-pointer hover:bg-accent/20">
                            {depService?.name || dep}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2 text-sm">Scalability</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedService.scalabilityNotes}
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2 text-sm">Security</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedService.securityNotes}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ServicesView

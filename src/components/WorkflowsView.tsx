import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { workflows, Workflow } from '@/lib/architecture-data'
import { FlowArrow, Clock, Lightning, Calendar as CalendarIcon, Bell } from '@phosphor-icons/react'

const triggerIcons = {
  event: Lightning,
  cron: CalendarIcon,
  manual: Clock
}

const triggerColors = {
  event: 'bg-accent/20 text-accent-foreground',
  cron: 'bg-green-500/20 text-green-700',
  manual: 'bg-orange-500/20 text-orange-700'
}

const WorkflowsView = () => {
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Automated Workflows</h2>
        <p className="text-muted-foreground text-lg">
          End-to-end business process automation across LMS, ERP, and DevOps systems
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {workflows.map(workflow => {
          const TriggerIcon = triggerIcons[workflow.triggerType]
          return (
            <Card 
              key={workflow.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedWorkflow(workflow)}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">
                    {workflow.category}
                  </Badge>
                  <Badge variant="outline" className={`${triggerColors[workflow.triggerType]} text-xs`}>
                    <TriggerIcon size={14} className="mr-1" />
                    {workflow.triggerType}
                  </Badge>
                </div>
                <CardTitle className="text-xl">{workflow.name}</CardTitle>
                <CardDescription>{workflow.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Workflow Steps: {workflow.steps.length}</p>
                    <div className="space-y-1">
                      {workflow.steps.slice(0, 3).map((step, idx) => (
                        <div key={step.id} className="flex items-center gap-2 text-sm">
                          <span className="text-xs text-muted-foreground font-mono">{idx + 1}.</span>
                          <span className="truncate">{step.name}</span>
                        </div>
                      ))}
                      {workflow.steps.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{workflow.steps.length - 3} more steps
                        </p>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    View Full Workflow
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={!!selectedWorkflow} onOpenChange={() => setSelectedWorkflow(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedWorkflow && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <DialogTitle className="text-2xl">{selectedWorkflow.name}</DialogTitle>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      {selectedWorkflow.category}
                    </Badge>
                    <Badge variant="outline" className={`${triggerColors[selectedWorkflow.triggerType]} text-xs`}>
                      {selectedWorkflow.triggerType}
                    </Badge>
                  </div>
                </div>
                <DialogDescription className="text-base">
                  {selectedWorkflow.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <FlowArrow size={20} weight="duotone" />
                    Workflow Steps
                  </h4>
                  <div className="space-y-3">
                    {selectedWorkflow.steps.map((step, idx) => (
                      <div key={step.id} className="relative">
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-semibold text-sm">
                              {idx + 1}
                            </div>
                            {idx < selectedWorkflow.steps.length - 1 && (
                              <div className="w-0.5 h-full min-h-12 bg-border" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h5 className="font-semibold">{step.name}</h5>
                              {step.notification && (
                                <Badge variant="outline" className="text-xs">
                                  <Bell size={12} className="mr-1" />
                                  Notification
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{step.action}</p>
                            <Badge variant="secondary" className="text-xs font-mono">
                              {step.service}
                            </Badge>
                            {step.dataTransform && (
                              <div className="mt-2 p-2 bg-muted rounded text-xs">
                                <span className="text-muted-foreground">Transform:</span>{' '}
                                <code className="font-mono">{step.dataTransform}</code>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Affected Services</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedWorkflow.affectedServices.map(service => (
                      <Badge key={service} variant="outline" className="font-mono">
                        {service}
                      </Badge>
                    ))}
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

export default WorkflowsView

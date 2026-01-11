import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { technologies } from '@/lib/architecture-data'
import { Code, Database, CloudArrowUp, LockKey, GitBranch } from '@phosphor-icons/react'

const categoryIcons: Record<string, React.ElementType> = {
  'Backend Runtime': Code,
  'Database': Database,
  'Cache & Queue': Database,
  'Compute': CloudArrowUp,
  'Event Bus': GitBranch,
  'Container Orchestration': CloudArrowUp,
  'Authentication': LockKey
}

const TechStackView = () => {
  const categories = Array.from(new Set(technologies.map(t => t.category)))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Technology Stack</h2>
        <p className="text-muted-foreground text-lg">
          Comprehensive technology choices with justifications and trade-off analysis
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Backend</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">Node.js</p>
            <p className="text-sm text-muted-foreground">Express & NestJS</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Databases</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">Hybrid</p>
            <p className="text-sm text-muted-foreground">MongoDB + PostgreSQL</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Cloud</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">Multi-Cloud</p>
            <p className="text-sm text-muted-foreground">AWS + Azure</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/20 to-accent/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Architecture</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">Event-Driven</p>
            <p className="text-sm text-muted-foreground">Microservices</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Technology Decisions</CardTitle>
          <CardDescription>
            Detailed justifications, alternatives considered, and important considerations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {categories.map(category => {
              const techs = technologies.filter(t => t.category === category)
              const Icon = categoryIcons[category] || Code
              
              return (
                <AccordionItem key={category} value={category}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Icon size={20} weight="duotone" className="text-accent" />
                      <span className="font-semibold">{category}</span>
                      <Badge variant="secondary" className="ml-2">{techs.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      {techs.map(tech => (
                        <div key={tech.id} className="border rounded-lg p-4 space-y-3">
                          <div>
                            <h4 className="font-semibold text-lg mb-1">{tech.name}</h4>
                            <p className="text-sm text-muted-foreground">{tech.purpose}</p>
                          </div>

                          <div>
                            <p className="text-sm font-medium mb-2">✅ Why This Choice</p>
                            <p className="text-sm text-muted-foreground bg-green-500/5 p-3 rounded border border-green-500/20">
                              {tech.justification}
                            </p>
                          </div>

                          {(tech.alternatives || []).length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">Alternatives Considered</p>
                              <div className="flex flex-wrap gap-2">
                                {(tech.alternatives || []).map(alt => (
                                  <Badge key={alt} variant="outline" className="text-xs">
                                    {alt}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {(tech.considerations || []).length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">⚠️ Important Considerations</p>
                              <ul className="space-y-1">
                                {(tech.considerations || []).map((consideration, idx) => (
                                  <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                                    <span className="text-accent">•</span>
                                    <span>{consideration}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Development Stack</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Core Technologies</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 border rounded">
                  <span className="font-mono text-sm">Node.js + TypeScript</span>
                  <Badge variant="secondary">Backend</Badge>
                </div>
                <div className="flex justify-between items-center p-2 border rounded">
                  <span className="font-mono text-sm">Express / NestJS</span>
                  <Badge variant="secondary">Framework</Badge>
                </div>
                <div className="flex justify-between items-center p-2 border rounded">
                  <span className="font-mono text-sm">React</span>
                  <Badge variant="secondary">Frontend</Badge>
                </div>
                <div className="flex justify-between items-center p-2 border rounded">
                  <span className="font-mono text-sm">MongoDB / PostgreSQL</span>
                  <Badge variant="secondary">Database</Badge>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Infrastructure</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 border rounded">
                  <span className="font-mono text-sm">Docker + Kubernetes</span>
                  <Badge variant="secondary">Container</Badge>
                </div>
                <div className="flex justify-between items-center p-2 border rounded">
                  <span className="font-mono text-sm">GitHub Actions</span>
                  <Badge variant="secondary">CI/CD</Badge>
                </div>
                <div className="flex justify-between items-center p-2 border rounded">
                  <span className="font-mono text-sm">AWS / Azure</span>
                  <Badge variant="secondary">Cloud</Badge>
                </div>
                <div className="flex justify-between items-center p-2 border rounded">
                  <span className="font-mono text-sm">Grafana + Prometheus</span>
                  <Badge variant="secondary">Monitoring</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default TechStackView

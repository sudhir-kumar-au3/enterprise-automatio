import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { securityPatterns, scalabilityPatterns } from '@/lib/architecture-data'
import { ShieldCheck, TrendUp, Lock, LockKey, Database, CloudArrowUp, ChartLine } from '@phosphor-icons/react'

const SecurityView = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Security & Scalability</h2>
        <p className="text-muted-foreground text-lg">
          Comprehensive security patterns, scalability strategies, and fault-tolerance mechanisms
        </p>
      </div>

      <Tabs defaultValue="security" className="space-y-6">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="security" className="gap-2">
            <ShieldCheck size={18} />
            Security
          </TabsTrigger>
          <TabsTrigger value="scalability" className="gap-2">
            <TrendUp size={18} />
            Scalability
          </TabsTrigger>
        </TabsList>

        <TabsContent value="security" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LockKey size={24} weight="duotone" />
                  Authentication
                </CardTitle>
                <CardDescription>Multi-layer auth strategy</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-card rounded">
                  <span className="text-sm">JWT Tokens</span>
                  <Badge variant="secondary" className="text-xs">Stateless</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-card rounded">
                  <span className="text-sm">OAuth 2.0</span>
                  <Badge variant="secondary" className="text-xs">Standard</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-card rounded">
                  <span className="text-sm">SSO Integration</span>
                  <Badge variant="secondary" className="text-xs">Enterprise</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-card rounded">
                  <span className="text-sm">MFA Support</span>
                  <Badge variant="secondary" className="text-xs">2FA/TOTP</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock size={24} weight="duotone" />
                  Encryption
                </CardTitle>
                <CardDescription>Data protection at all layers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-card rounded">
                  <span className="text-sm">TLS 1.3</span>
                  <Badge variant="secondary" className="text-xs">In Transit</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-card rounded">
                  <span className="text-sm">AES-256</span>
                  <Badge variant="secondary" className="text-xs">At Rest</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-card rounded">
                  <span className="text-sm">Field-Level</span>
                  <Badge variant="secondary" className="text-xs">PII Data</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-card rounded">
                  <span className="text-sm">AWS KMS / Azure Key Vault</span>
                  <Badge variant="secondary" className="text-xs">Key Mgmt</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Security Patterns & Implementations</CardTitle>
              <CardDescription>
                Comprehensive security measures across all system components
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(securityPatterns || []).map(pattern => (
                  <div key={pattern.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h4 className="font-semibold text-lg">{pattern.name}</h4>
                      <ShieldCheck size={24} weight="duotone" className="text-green-600 shrink-0" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{pattern.description}</p>
                    <div className="bg-muted/50 p-3 rounded mb-3">
                      <p className="text-sm font-mono">{pattern.implementation}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(pattern.services || []).map(service => (
                        <Badge key={service} variant="outline" className="text-xs">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Security Measures</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Access Control</h4>
                  <ul className="space-y-2">
                    <li className="text-sm flex gap-2">
                      <span className="text-accent">✓</span>
                      <span>Role-Based Access Control (RBAC)</span>
                    </li>
                    <li className="text-sm flex gap-2">
                      <span className="text-accent">✓</span>
                      <span>Attribute-Based Access Control (ABAC)</span>
                    </li>
                    <li className="text-sm flex gap-2">
                      <span className="text-accent">✓</span>
                      <span>API key management & rotation</span>
                    </li>
                    <li className="text-sm flex gap-2">
                      <span className="text-accent">✓</span>
                      <span>Service-to-service authentication</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Compliance & Monitoring</h4>
                  <ul className="space-y-2">
                    <li className="text-sm flex gap-2">
                      <span className="text-accent">✓</span>
                      <span>GDPR & data privacy compliance</span>
                    </li>
                    <li className="text-sm flex gap-2">
                      <span className="text-accent">✓</span>
                      <span>Audit logging for all operations</span>
                    </li>
                    <li className="text-sm flex gap-2">
                      <span className="text-accent">✓</span>
                      <span>Security scanning (SAST/DAST)</span>
                    </li>
                    <li className="text-sm flex gap-2">
                      <span className="text-accent">✓</span>
                      <span>Penetration testing & vulnerability mgmt</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scalability" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-accent/20 to-accent/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CloudArrowUp size={24} weight="duotone" />
                  Horizontal Scaling
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">All services designed as stateless for linear scaling</p>
                <div className="pt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    <span>Load balancing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    <span>Auto-scaling groups</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    <span>Container orchestration</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database size={24} weight="duotone" />
                  Database Optimization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">Multi-layer data strategy for performance</p>
                <div className="pt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>Read replicas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>Connection pooling</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>Query optimization</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChartLine size={24} weight="duotone" />
                  Caching Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">Multi-tier caching for reduced latency</p>
                <div className="pt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <span>Redis cache layer</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <span>CDN for static assets</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <span>API response caching</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Scalability Patterns & Implementations</CardTitle>
              <CardDescription>
                Proven strategies for handling growth and maintaining performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(scalabilityPatterns || []).map(pattern => (
                  <div key={pattern.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h4 className="font-semibold text-lg">{pattern.name}</h4>
                      <TrendUp size={24} weight="duotone" className="text-accent shrink-0" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{pattern.description}</p>
                    <div className="bg-muted/50 p-3 rounded mb-3">
                      <p className="text-sm font-mono">{pattern.implementation}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(pattern.services || []).map(service => (
                        <Badge key={service} variant="outline" className="text-xs">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fault Tolerance & High Availability</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Redundancy Patterns</h4>
                  <ul className="space-y-2">
                    <li className="text-sm flex gap-2">
                      <span className="text-accent">✓</span>
                      <span>Multi-region deployment</span>
                    </li>
                    <li className="text-sm flex gap-2">
                      <span className="text-accent">✓</span>
                      <span>Database replication & failover</span>
                    </li>
                    <li className="text-sm flex gap-2">
                      <span className="text-accent">✓</span>
                      <span>Circuit breaker pattern</span>
                    </li>
                    <li className="text-sm flex gap-2">
                      <span className="text-accent">✓</span>
                      <span>Health checks & auto-recovery</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Monitoring & Alerting</h4>
                  <ul className="space-y-2">
                    <li className="text-sm flex gap-2">
                      <span className="text-accent">✓</span>
                      <span>Real-time metrics (Prometheus)</span>
                    </li>
                    <li className="text-sm flex gap-2">
                      <span className="text-accent">✓</span>
                      <span>Distributed tracing (Jaeger/X-Ray)</span>
                    </li>
                    <li className="text-sm flex gap-2">
                      <span className="text-accent">✓</span>
                      <span>Automated alerting (PagerDuty)</span>
                    </li>
                    <li className="text-sm flex gap-2">
                      <span className="text-accent">✓</span>
                      <span>Log aggregation (ELK/CloudWatch)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SecurityView

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { services } from '@/lib/architecture-data'
import { CloudArrowUp, Database, GitBranch, Bell, Lock, CirclesThree } from '@phosphor-icons/react'

const categoryIcons = {
  lms: Database,
  erp: CirclesThree,
  devops: GitBranch,
  communication: Bell,
  core: Lock
}

const categoryLabels = {
  lms: 'LMS',
  erp: 'ERP',
  devops: 'DevOps',
  communication: 'Communication',
  core: 'Core Infrastructure'
}

const categoryColors = {
  lms: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  erp: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  devops: 'bg-green-500/10 text-green-700 border-green-500/20',
  communication: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
  core: 'bg-accent/20 text-accent-foreground border-accent/30'
}

const ArchitectureView = () => {
  const coreServices = services.filter(s => s.category === 'core')
  const lmsServices = services.filter(s => s.category === 'lms')
  const erpServices = services.filter(s => s.category === 'erp')
  const devopsServices = services.filter(s => s.category === 'devops')
  const commServices = services.filter(s => s.category === 'communication')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">System Architecture Overview</h2>
        <p className="text-muted-foreground text-lg">
          Distributed microservices architecture on AWS & Azure with event-driven communication
        </p>
      </div>

      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudArrowUp size={24} weight="duotone" className="text-accent" />
            Multi-Cloud Deployment
          </CardTitle>
          <CardDescription>
            Hybrid AWS & Azure infrastructure for redundancy and feature optimization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-card rounded-lg border">
              <h4 className="font-semibold mb-2">AWS Services</h4>
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="secondary">Lambda</Badge>
                <Badge variant="secondary">S3</Badge>
                <Badge variant="secondary">DynamoDB</Badge>
                <Badge variant="secondary">EventBridge</Badge>
                <Badge variant="secondary">SQS/SNS</Badge>
                <Badge variant="secondary">CloudWatch</Badge>
                <Badge variant="secondary">ECS</Badge>
                <Badge variant="secondary">API Gateway</Badge>
              </div>
            </div>
            <div className="p-4 bg-card rounded-lg border">
              <h4 className="font-semibold mb-2">Azure Services</h4>
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="secondary">Azure Functions</Badge>
                <Badge variant="secondary">Service Bus</Badge>
                <Badge variant="secondary">App Services</Badge>
                <Badge variant="secondary">Azure AD B2C</Badge>
                <Badge variant="secondary">EventGrid</Badge>
                <Badge variant="secondary">Monitor</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Service Layers</h3>
        
        <div className="space-y-4">
          <ServiceLayer
            title={categoryLabels.core}
            icon={categoryIcons.core}
            services={coreServices}
            color={categoryColors.core}
          />
          
          <div className="grid md:grid-cols-2 gap-4">
            <ServiceLayer
              title={categoryLabels.lms}
              icon={categoryIcons.lms}
              services={lmsServices}
              color={categoryColors.lms}
            />
            <ServiceLayer
              title={categoryLabels.erp}
              icon={categoryIcons.erp}
              services={erpServices}
              color={categoryColors.erp}
            />
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <ServiceLayer
              title={categoryLabels.devops}
              icon={categoryIcons.devops}
              services={devopsServices}
              color={categoryColors.devops}
            />
            <ServiceLayer
              title={categoryLabels.communication}
              icon={categoryIcons.communication}
              services={commServices}
              color={categoryColors.communication}
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Architecture Patterns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Event-Driven</h4>
              <p className="text-sm text-muted-foreground">
                Services communicate via EventBridge/Service Bus for loose coupling and scalability
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">API Gateway</h4>
              <p className="text-sm text-muted-foreground">
                Centralized entry point for authentication, rate limiting, and routing
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">CQRS Pattern</h4>
              <p className="text-sm text-muted-foreground">
                Separate read/write paths with caching for optimal performance
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface ServiceLayerProps {
  title: string
  icon: React.ElementType
  services: typeof services
  color: string
}

const ServiceLayer = ({ title, icon: Icon, services, color }: ServiceLayerProps) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Icon size={20} weight="duotone" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {services.map(service => (
            <Badge
              key={service.id}
              variant="outline"
              className={`${color} font-mono text-xs`}
            >
              {service.name}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default ArchitectureView

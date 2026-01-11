export type ServiceCategory = 'lms' | 'erp' | 'devops' | 'communication' | 'core'

export type ServiceStatus = 'deployed' | 'planned' | 'in-progress'

export interface Service {
  id: string
  name: string
  category: ServiceCategory
  status: ServiceStatus
  description: string
  techStack: string[]
  dependencies: string[]
  endpoints?: string[]
  databases?: string[]
  cloudServices: string[]
  scalabilityNotes: string
  securityNotes: string
}

export interface Workflow {
  id: string
  name: string
  category: string
  description: string
  steps: WorkflowStep[]
  triggerType: 'event' | 'cron' | 'manual'
  affectedServices: string[]
}

export interface WorkflowStep {
  id: string
  name: string
  service: string
  action: string
  dataTransform?: string
  notification?: boolean
}

export interface Technology {
  id: string
  category: string
  name: string
  purpose: string
  alternatives: string[]
  justification: string
  considerations: string[]
}

export interface RoadmapPhase {
  id: string
  phase: number
  name: string
  duration: string
  priority: 'critical' | 'high' | 'medium'
  tasks: RoadmapTask[]
  dependencies: string[]
  outcomes: string[]
}

export interface RoadmapTask {
  id: string
  name: string
  effort: string
  status: 'pending' | 'in-progress' | 'completed'
  owner?: string
}

export const services: Service[] = [
  {
    id: 'auth-service',
    name: 'Authentication Service',
    category: 'core',
    status: 'deployed',
    description: 'Centralized authentication and authorization using JWT/OAuth/SSO',
    techStack: ['Node.js', 'Express', 'JWT', 'OAuth2', 'Redis'],
    dependencies: [],
    endpoints: ['/auth/login', '/auth/register', '/auth/refresh', '/auth/sso'],
    databases: ['MongoDB (users)', 'Redis (sessions)'],
    cloudServices: ['AWS Cognito', 'Azure AD B2C'],
    scalabilityNotes: 'Stateless tokens, Redis for session caching, horizontal scaling',
    securityNotes: 'HTTPS only, token rotation, rate limiting, MFA support'
  },
  {
    id: 'user-management',
    name: 'User Management Service',
    category: 'core',
    status: 'deployed',
    description: 'User onboarding, profile management, RBAC',
    techStack: ['Node.js', 'Express', 'MongoDB'],
    dependencies: ['auth-service'],
    endpoints: ['/users', '/users/:id', '/users/:id/roles', '/users/onboard'],
    databases: ['MongoDB (users, roles, permissions)'],
    cloudServices: ['AWS S3 (profile images)', 'CloudFront'],
    scalabilityNotes: 'Read replicas for MongoDB, CDN for static assets',
    securityNotes: 'Role-based access control, field-level encryption for PII'
  },
  {
    id: 'course-service',
    name: 'Course Management Service',
    category: 'lms',
    status: 'deployed',
    description: 'Course creation, content management, enrollment',
    techStack: ['Node.js', 'Express', 'MongoDB', 'Redis'],
    dependencies: ['auth-service', 'user-management'],
    endpoints: ['/courses', '/courses/:id', '/courses/:id/enroll', '/courses/:id/content'],
    databases: ['MongoDB (courses, content, enrollments)', 'Redis (cache)'],
    cloudServices: ['AWS S3 (course materials)', 'CloudFront', 'Lambda (video processing)'],
    scalabilityNotes: 'Heavy read caching, CDN for course materials, async video processing',
    securityNotes: 'Content access control per enrollment, signed URLs for media'
  },
  {
    id: 'exam-service',
    name: 'Exam & Assessment Service',
    category: 'lms',
    status: 'in-progress',
    description: 'Exam scheduling, question banks, automated grading, result publishing',
    techStack: ['Node.js', 'NestJS', 'MongoDB', 'Redis'],
    dependencies: ['course-service', 'notification-service'],
    endpoints: ['/exams', '/exams/:id/schedule', '/exams/:id/submit', '/exams/:id/results'],
    databases: ['MongoDB (exams, submissions, results)', 'Redis (active exam sessions)'],
    cloudServices: ['AWS DynamoDB (real-time exam state)', 'EventBridge'],
    scalabilityNotes: 'Write-heavy during submissions, queue-based grading, read replicas',
    securityNotes: 'Proctoring integration, submission integrity checks, time-bound access'
  },
  {
    id: 'invoice-service',
    name: 'Invoice Management Service',
    category: 'erp',
    status: 'deployed',
    description: 'Invoice generation, payment tracking, financial reporting',
    techStack: ['Node.js', 'Express', 'MongoDB', 'PostgreSQL'],
    dependencies: ['user-management', 'notification-service'],
    endpoints: ['/invoices', '/invoices/:id', '/invoices/generate', '/invoices/:id/pay'],
    databases: ['PostgreSQL (invoices, transactions)', 'MongoDB (audit logs)'],
    cloudServices: ['AWS S3 (invoice PDFs)', 'Lambda (PDF generation)', 'SNS'],
    scalabilityNotes: 'SQL for transactional integrity, async PDF generation, sharding by year',
    securityNotes: 'Audit trail for all changes, encryption at rest, PCI compliance for payments'
  },
  {
    id: 'payroll-service',
    name: 'Payroll Service',
    category: 'erp',
    status: 'planned',
    description: 'Payroll calculations, salary disbursement triggers, tax compliance',
    techStack: ['Node.js', 'NestJS', 'PostgreSQL', 'Redis'],
    dependencies: ['attendance-service', 'user-management'],
    endpoints: ['/payroll', '/payroll/calculate', '/payroll/process', '/payroll/reports'],
    databases: ['PostgreSQL (payroll, salary, deductions)'],
    cloudServices: ['AWS Lambda (scheduled runs)', 'EventBridge', 'Secrets Manager'],
    scalabilityNotes: 'Batch processing, scheduled Lambda triggers, idempotent operations',
    securityNotes: 'Highly sensitive data, field-level encryption, strict access control'
  },
  {
    id: 'attendance-service',
    name: 'Attendance Tracking Service',
    category: 'erp',
    status: 'in-progress',
    description: 'Attendance recording, leave management, synchronization with payroll',
    techStack: ['Node.js', 'Express', 'MongoDB', 'Redis'],
    dependencies: ['user-management'],
    endpoints: ['/attendance', '/attendance/checkin', '/attendance/leave', '/attendance/sync'],
    databases: ['MongoDB (attendance records)', 'Redis (real-time status)'],
    cloudServices: ['Azure Functions', 'Azure Service Bus', 'EventGrid'],
    scalabilityNotes: 'Time-series data optimization, aggregation pipelines, event sourcing',
    securityNotes: 'Tamper-proof logging, geolocation validation, biometric integration'
  },
  {
    id: 'cicd-orchestrator',
    name: 'CI/CD Orchestration Service',
    category: 'devops',
    status: 'deployed',
    description: 'Automated build, test, deployment pipelines',
    techStack: ['Node.js', 'GitHub Actions', 'Jenkins', 'Docker'],
    dependencies: [],
    endpoints: ['/pipelines', '/pipelines/:id/trigger', '/pipelines/:id/status'],
    databases: ['MongoDB (pipeline configs, logs)'],
    cloudServices: ['AWS CodePipeline', 'AWS CodeBuild', 'ECR', 'Azure DevOps'],
    scalabilityNotes: 'Parallel pipeline execution, artifact caching, distributed builds',
    securityNotes: 'Secret management, signed artifacts, vulnerability scanning'
  },
  {
    id: 'monitoring-service',
    name: 'Monitoring & Alerting Service',
    category: 'devops',
    status: 'deployed',
    description: 'Application monitoring, infrastructure health checks, alert management',
    techStack: ['Node.js', 'Prometheus', 'Grafana', 'CloudWatch'],
    dependencies: [],
    endpoints: ['/metrics', '/alerts', '/health'],
    databases: ['TimeSeries DB (metrics)', 'MongoDB (alert configs)'],
    cloudServices: ['AWS CloudWatch', 'Azure Monitor', 'SNS', 'PagerDuty'],
    scalabilityNotes: 'Metrics aggregation, retention policies, distributed tracing',
    securityNotes: 'Secure metric endpoints, alert throttling, incident response automation'
  },
  {
    id: 'notification-service',
    name: 'Notification Service',
    category: 'communication',
    status: 'deployed',
    description: 'Multi-channel notifications: email, SMS, WhatsApp, push',
    techStack: ['Node.js', 'Express', 'Redis', 'BullMQ'],
    dependencies: ['user-management'],
    endpoints: ['/notifications/send', '/notifications/templates', '/notifications/preferences'],
    databases: ['MongoDB (templates, logs)', 'Redis (queue)'],
    cloudServices: ['AWS SES', 'SNS', 'Twilio', 'WhatsApp Business API', 'Firebase Cloud Messaging'],
    scalabilityNotes: 'Queue-based async processing, rate limiting per channel, batch sending',
    securityNotes: 'User consent management, unsubscribe handling, data privacy compliance'
  },
  {
    id: 'sync-engine',
    name: 'Data Synchronization Engine',
    category: 'core',
    status: 'in-progress',
    description: 'Real-time data sync between LMS, ERP, and third-party services',
    techStack: ['Node.js', 'NestJS', 'Redis', 'Kafka'],
    dependencies: ['course-service', 'invoice-service', 'user-management'],
    endpoints: ['/sync/trigger', '/sync/status', '/sync/conflicts'],
    databases: ['MongoDB (sync logs, conflict resolution)', 'Redis (sync state)'],
    cloudServices: ['AWS EventBridge', 'Azure Service Bus', 'SQS', 'SNS'],
    scalabilityNotes: 'Event-driven architecture, eventual consistency, idempotent operations',
    securityNotes: 'Data validation, conflict resolution, audit logging'
  },
  {
    id: 'api-gateway',
    name: 'API Gateway',
    category: 'core',
    status: 'deployed',
    description: 'Central entry point, routing, rate limiting, authentication',
    techStack: ['Kong', 'NGINX', 'Node.js'],
    dependencies: ['auth-service'],
    endpoints: ['/* (proxies all services)'],
    databases: ['Redis (rate limiting)'],
    cloudServices: ['AWS API Gateway', 'Azure API Management', 'CloudFront'],
    scalabilityNotes: 'Multi-region deployment, automatic scaling, request caching',
    securityNotes: 'DDoS protection, JWT validation, request/response encryption, API key management'
  }
]

export const workflows: Workflow[] = [
  {
    id: 'student-enrollment',
    name: 'Student Enrollment Workflow',
    category: 'Academic',
    description: 'Complete flow from student registration to course enrollment with invoice generation and notifications',
    triggerType: 'event',
    affectedServices: ['user-management', 'course-service', 'invoice-service', 'notification-service'],
    steps: [
      { id: 'step1', name: 'User Registration', service: 'User Management', action: 'Create user account with student role' },
      { id: 'step2', name: 'Email Verification', service: 'Notification Service', action: 'Send verification email', notification: true },
      { id: 'step3', name: 'Course Selection', service: 'Course Management', action: 'Student selects course and enrolls' },
      { id: 'step4', name: 'Invoice Generation', service: 'Invoice Service', action: 'Generate enrollment invoice', dataTransform: 'Course fee → Invoice line items' },
      { id: 'step5', name: 'Payment Notification', service: 'Notification Service', action: 'Send invoice via email/SMS', notification: true },
      { id: 'step6', name: 'Access Granted', service: 'Course Management', action: 'Grant access to course materials upon payment' },
      { id: 'step7', name: 'Welcome Message', service: 'Notification Service', action: 'Send welcome notification with course details', notification: true }
    ]
  },
  {
    id: 'exam-result-publishing',
    name: 'Exam Result Publishing',
    category: 'Academic',
    description: 'Automated exam grading, result calculation, and multi-channel notification to students',
    triggerType: 'event',
    affectedServices: ['exam-service', 'course-service', 'notification-service', 'sync-engine'],
    steps: [
      { id: 'step1', name: 'Exam Submission', service: 'Exam Service', action: 'Student submits exam answers' },
      { id: 'step2', name: 'Auto Grading', service: 'Exam Service', action: 'Grade objective questions automatically' },
      { id: 'step3', name: 'Manual Review Queue', service: 'Exam Service', action: 'Queue subjective answers for instructor review' },
      { id: 'step4', name: 'Final Score Calculation', service: 'Exam Service', action: 'Calculate total score and grade', dataTransform: 'Weighted score calculation' },
      { id: 'step5', name: 'Result Storage', service: 'Course Service', action: 'Store result in student transcript' },
      { id: 'step6', name: 'ERP Sync', service: 'Sync Engine', action: 'Sync academic results to ERP for reporting' },
      { id: 'step7', name: 'Result Notification', service: 'Notification Service', action: 'Notify student via email/push/SMS', notification: true }
    ]
  },
  {
    id: 'payroll-processing',
    name: 'Monthly Payroll Processing',
    category: 'ERP',
    description: 'Automated payroll calculation based on attendance with notification and bank transfer triggers',
    triggerType: 'cron',
    affectedServices: ['payroll-service', 'attendance-service', 'invoice-service', 'notification-service'],
    steps: [
      { id: 'step1', name: 'Trigger Job', service: 'Payroll Service', action: 'Monthly cron job starts (1st of month)' },
      { id: 'step2', name: 'Fetch Attendance', service: 'Attendance Service', action: 'Retrieve attendance data for all employees' },
      { id: 'step3', name: 'Calculate Payroll', service: 'Payroll Service', action: 'Calculate salary with deductions', dataTransform: 'Attendance → Net salary' },
      { id: 'step4', name: 'Generate Payslips', service: 'Invoice Service', action: 'Generate PDF payslips for all employees' },
      { id: 'step5', name: 'Bank File Creation', service: 'Payroll Service', action: 'Create bank transfer file (NACHA/SEPA)' },
      { id: 'step6', name: 'Approval Queue', service: 'Payroll Service', action: 'Queue for finance approval' },
      { id: 'step7', name: 'Payslip Distribution', service: 'Notification Service', action: 'Email payslips to employees', notification: true }
    ]
  },
  {
    id: 'cicd-deployment',
    name: 'CI/CD Deployment Pipeline',
    category: 'DevOps',
    description: 'Automated build, test, deploy pipeline with monitoring and rollback capabilities',
    triggerType: 'event',
    affectedServices: ['cicd-orchestrator', 'monitoring-service', 'notification-service'],
    steps: [
      { id: 'step1', name: 'Code Push', service: 'CI/CD Orchestrator', action: 'Developer pushes to main branch (GitHub webhook)' },
      { id: 'step2', name: 'Build & Test', service: 'CI/CD Orchestrator', action: 'Run automated tests, build Docker image' },
      { id: 'step3', name: 'Security Scan', service: 'CI/CD Orchestrator', action: 'Vulnerability scanning, SAST/DAST' },
      { id: 'step4', name: 'Deploy to Staging', service: 'CI/CD Orchestrator', action: 'Deploy to staging environment (AWS ECS/Azure App Service)' },
      { id: 'step5', name: 'Integration Tests', service: 'CI/CD Orchestrator', action: 'Run E2E tests in staging' },
      { id: 'step6', name: 'Production Deploy', service: 'CI/CD Orchestrator', action: 'Blue-green deployment to production' },
      { id: 'step7', name: 'Health Check', service: 'Monitoring Service', action: 'Verify service health and metrics' },
      { id: 'step8', name: 'Deployment Notification', service: 'Notification Service', action: 'Notify team on Slack/email', notification: true }
    ]
  }
]

export const technologies: Technology[] = [
  {
    id: 'nodejs',
    category: 'Backend Runtime',
    name: 'Node.js (Express/NestJS)',
    purpose: 'Primary backend runtime for all microservices',
    alternatives: ['Python (Django/FastAPI)', 'Java (Spring Boot)', 'Go'],
    justification: 'Team expertise, unified JavaScript ecosystem, excellent async I/O performance, large ecosystem, consistent with existing LMS/ERP stack',
    considerations: ['CPU-intensive tasks may need worker threads or separate service', 'Memory management for long-running processes', 'Use NestJS for complex services needing structure']
  },
  {
    id: 'mongodb',
    category: 'Database',
    name: 'MongoDB',
    purpose: 'Primary database for flexible schema, document-oriented data',
    alternatives: ['PostgreSQL', 'MySQL', 'DynamoDB'],
    justification: 'Existing stack alignment, flexible schema for evolving requirements, excellent horizontal scaling, rich query capabilities, good for hierarchical data (courses, content)',
    considerations: ['Use transactions for critical operations', 'Implement proper indexing strategy', 'Read replicas for scaling', 'Not ideal for complex joins']
  },
  {
    id: 'postgresql',
    category: 'Database',
    name: 'PostgreSQL',
    purpose: 'Relational database for transactional data (invoices, payroll)',
    alternatives: ['MySQL', 'Aurora PostgreSQL', 'SQL Server'],
    justification: 'ACID compliance for financial data, complex queries with joins, mature ecosystem, strong consistency guarantees, JSON support for hybrid use cases',
    considerations: ['Connection pooling (PgBouncer)', 'Vertical scaling limits', 'Backup and recovery strategy', 'Partitioning for large tables']
  },
  {
    id: 'redis',
    category: 'Cache & Queue',
    name: 'Redis',
    purpose: 'Caching layer, session storage, pub/sub, job queues',
    alternatives: ['Memcached', 'DragonflyDB', 'KeyDB'],
    justification: 'Sub-millisecond latency, rich data structures (strings, sets, sorted sets), pub/sub for real-time features, persistence options, widely adopted',
    considerations: ['Use Redis Cluster for high availability', 'Separate instances for cache vs queue', 'Memory management and eviction policies', 'Consider persistence vs performance trade-offs']
  },
  {
    id: 'aws-lambda',
    category: 'Compute',
    name: 'AWS Lambda',
    purpose: 'Serverless compute for event-driven tasks, scheduled jobs',
    alternatives: ['Azure Functions', 'Google Cloud Functions', 'Fargate'],
    justification: 'Cost-effective for sporadic workloads, automatic scaling, no server management, easy integration with AWS services (S3, DynamoDB, SNS)',
    considerations: ['Cold start latency (use provisioned concurrency for critical paths)', '15-min timeout limit', 'Stateless architecture required', 'VPC networking overhead']
  },
  {
    id: 'eventbridge',
    category: 'Event Bus',
    name: 'AWS EventBridge / Azure Service Bus',
    purpose: 'Event-driven architecture backbone, service decoupling',
    alternatives: ['Apache Kafka', 'RabbitMQ', 'AWS SNS/SQS'],
    justification: 'Managed service (reduced ops overhead), built-in filtering and routing, schema registry, at-least-once delivery, retry policies, cross-service communication',
    considerations: ['Event schema versioning strategy', 'Idempotent consumers', 'Dead letter queues for failed events', 'Cost at high volumes']
  },
  {
    id: 'docker-k8s',
    category: 'Container Orchestration',
    name: 'Docker + Kubernetes (EKS/AKS)',
    purpose: 'Container orchestration for microservices, consistent deployment',
    alternatives: ['Docker Swarm', 'ECS/Fargate', 'Azure Container Apps'],
    justification: 'Industry standard, cloud-agnostic, powerful scaling and self-healing, service mesh capabilities (Istio/Linkerd), existing team knowledge',
    considerations: ['Operational complexity (consider managed K8s)', 'Cost optimization (node auto-scaling)', 'Monitoring and observability setup', 'GitOps workflow (ArgoCD/Flux)']
  },
  {
    id: 'jwt-oauth',
    category: 'Authentication',
    name: 'JWT + OAuth 2.0 + SSO',
    purpose: 'Secure authentication and authorization across all services',
    alternatives: ['Session-based auth', 'SAML', 'API Keys'],
    justification: 'Stateless tokens (scalable), standardized OAuth flows, SSO integration with enterprise IdPs (Azure AD, Okta), fine-grained permissions via JWT claims',
    considerations: ['Token expiration and refresh strategy', 'Secure storage (httpOnly cookies)', 'Token revocation mechanism', 'Secret rotation']
  }
]

export const roadmap: RoadmapPhase[] = [
  {
    id: 'phase1',
    phase: 1,
    name: 'Foundation & Core Services',
    duration: '8-10 weeks',
    priority: 'critical',
    dependencies: [],
    outcomes: ['Authentication working', 'API Gateway deployed', 'Basic monitoring', 'User management live'],
    tasks: [
      { id: 't1-1', name: 'Set up API Gateway (Kong/NGINX)', effort: '1 week', status: 'completed' },
      { id: 't1-2', name: 'Implement Authentication Service (JWT + OAuth)', effort: '2 weeks', status: 'completed' },
      { id: 't1-3', name: 'Deploy User Management Service with RBAC', effort: '2 weeks', status: 'completed' },
      { id: 't1-4', name: 'Set up MongoDB + Redis infrastructure', effort: '1 week', status: 'completed' },
      { id: 't1-5', name: 'Configure CI/CD pipelines (GitHub Actions)', effort: '1 week', status: 'in-progress' },
      { id: 't1-6', name: 'Implement basic monitoring (CloudWatch + Grafana)', effort: '1 week', status: 'in-progress' },
      { id: 't1-7', name: 'Deploy Notification Service (Email + SMS)', effort: '1 week', status: 'pending' }
    ]
  },
  {
    id: 'phase2',
    phase: 2,
    name: 'Domain Services & Workflows',
    duration: '10-12 weeks',
    priority: 'high',
    dependencies: ['phase1'],
    outcomes: ['LMS workflows automated', 'ERP core modules live', 'Event-driven architecture operational', 'Multi-channel notifications'],
    tasks: [
      { id: 't2-1', name: 'Build Course Management Service', effort: '2 weeks', status: 'completed' },
      { id: 't2-2', name: 'Implement Exam & Assessment Service', effort: '3 weeks', status: 'in-progress' },
      { id: 't2-3', name: 'Deploy Invoice Management Service', effort: '2 weeks', status: 'completed' },
      { id: 't2-4', name: 'Build Attendance Tracking Service', effort: '2 weeks', status: 'in-progress' },
      { id: 't2-5', name: 'Implement Data Sync Engine (EventBridge/Service Bus)', effort: '2 weeks', status: 'in-progress' },
      { id: 't2-6', name: 'Extend Notification Service (WhatsApp + Push)', effort: '1 week', status: 'pending' },
      { id: 't2-7', name: 'Student Enrollment Workflow (end-to-end)', effort: '1 week', status: 'pending' },
      { id: 't2-8', name: 'Exam Result Publishing Workflow', effort: '1 week', status: 'pending' }
    ]
  },
  {
    id: 'phase3',
    phase: 3,
    name: 'Advanced Automation & Optimization',
    duration: '8-10 weeks',
    priority: 'medium',
    dependencies: ['phase2'],
    outcomes: ['Payroll automation live', 'Advanced DevOps automation', 'Performance optimized', 'Full observability'],
    tasks: [
      { id: 't3-1', name: 'Implement Payroll Service with bank integration', effort: '3 weeks', status: 'pending' },
      { id: 't3-2', name: 'Payroll Processing Workflow (cron-based)', effort: '1 week', status: 'pending' },
      { id: 't3-3', name: 'Advanced monitoring & alerting (Prometheus + PagerDuty)', effort: '2 weeks', status: 'pending' },
      { id: 't3-4', name: 'Implement auto-scaling policies for all services', effort: '1 week', status: 'pending' },
      { id: 't3-5', name: 'Set up distributed tracing (Jaeger/X-Ray)', effort: '1 week', status: 'pending' },
      { id: 't3-6', name: 'Database optimization & indexing review', effort: '1 week', status: 'pending' },
      { id: 't3-7', name: 'Security audit & penetration testing', effort: '2 weeks', status: 'pending' },
      { id: 't3-8', name: 'Documentation & runbooks', effort: '1 week', status: 'pending' }
    ]
  }
]

export const securityPatterns = [
  {
    id: 'sec1',
    name: 'API Gateway Authentication',
    description: 'All requests authenticated at gateway before routing to services',
    implementation: 'JWT validation, API key management, OAuth flows',
    services: ['api-gateway', 'auth-service']
  },
  {
    id: 'sec2',
    name: 'Data Encryption',
    description: 'Encryption at rest and in transit for all sensitive data',
    implementation: 'TLS 1.3 for transit, AES-256 for rest, AWS KMS/Azure Key Vault',
    services: ['All services']
  },
  {
    id: 'sec3',
    name: 'Role-Based Access Control',
    description: 'Fine-grained permissions based on user roles',
    implementation: 'JWT claims, permission middleware, resource-level access control',
    services: ['user-management', 'auth-service']
  },
  {
    id: 'sec4',
    name: 'Secrets Management',
    description: 'No hardcoded secrets, centralized secret rotation',
    implementation: 'AWS Secrets Manager, Azure Key Vault, environment variables',
    services: ['All services']
  }
]

export const scalabilityPatterns = [
  {
    id: 'scale1',
    name: 'Horizontal Scaling',
    description: 'All services designed to scale horizontally with load',
    implementation: 'Stateless services, load balancing, auto-scaling groups',
    services: ['All services']
  },
  {
    id: 'scale2',
    name: 'Caching Strategy',
    description: 'Multi-layer caching to reduce database load',
    implementation: 'Redis cache, CDN for static assets, query result caching',
    services: ['course-service', 'user-management', 'api-gateway']
  },
  {
    id: 'scale3',
    name: 'Database Optimization',
    description: 'Read replicas, sharding, connection pooling',
    implementation: 'MongoDB replicas, PostgreSQL read replicas, connection pooling',
    services: ['All database-backed services']
  },
  {
    id: 'scale4',
    name: 'Async Processing',
    description: 'Queue-based async processing for heavy operations',
    implementation: 'BullMQ, SQS, Lambda triggers, background workers',
    services: ['notification-service', 'exam-service', 'payroll-service']
  }
]

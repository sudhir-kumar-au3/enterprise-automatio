import { Task } from './collaboration-data'
import { 
  Bug, 
  Sparkle, 
  MagnifyingGlass, 
  FileText, 
  Wrench, 
  ShieldCheck,
  Rocket,
  PaintBrush,
  Database,
  Lightning
} from '@phosphor-icons/react'

export interface TaskTemplate {
  id: string
  name: string
  description: string
  icon: React.ComponentType<any>
  category: 'development' | 'operations' | 'design' | 'documentation'
  defaultTitle: string
  defaultDescription: string
  defaultPriority: Task['priority']
  defaultTags: string[]
  suggestedDueDays?: number
}

export const taskTemplates: TaskTemplate[] = [
  {
    id: 'bug-fix',
    name: 'Bug Fix',
    description: 'Report and track a software bug',
    icon: Bug,
    category: 'development',
    defaultTitle: 'Fix: ',
    defaultDescription: '**Steps to reproduce:**\n1. \n2. \n3. \n\n**Expected behavior:**\n\n\n**Actual behavior:**\n\n\n**Additional context:**\n',
    defaultPriority: 'high',
    defaultTags: ['bug', 'fix'],
    suggestedDueDays: 3
  },
  {
    id: 'feature',
    name: 'New Feature',
    description: 'Develop a new feature or enhancement',
    icon: Sparkle,
    category: 'development',
    defaultTitle: 'Feature: ',
    defaultDescription: '**Feature overview:**\n\n\n**User story:**\nAs a [user type], I want to [action] so that [benefit].\n\n**Acceptance criteria:**\n- [ ] \n- [ ] \n- [ ] \n\n**Technical notes:**\n',
    defaultPriority: 'medium',
    defaultTags: ['feature', 'enhancement'],
    suggestedDueDays: 7
  },
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Review code changes or pull request',
    icon: MagnifyingGlass,
    category: 'development',
    defaultTitle: 'Review: ',
    defaultDescription: '**PR/Branch:**\n\n\n**Scope:**\n\n\n**Focus areas:**\n- [ ] Code quality\n- [ ] Test coverage\n- [ ] Performance\n- [ ] Security\n\n**Notes:**\n',
    defaultPriority: 'medium',
    defaultTags: ['review', 'code-quality'],
    suggestedDueDays: 2
  },
  {
    id: 'documentation',
    name: 'Documentation',
    description: 'Create or update documentation',
    icon: FileText,
    category: 'documentation',
    defaultTitle: 'Docs: ',
    defaultDescription: '**Documentation type:**\n[ ] API Documentation\n[ ] User Guide\n[ ] Technical Spec\n[ ] README\n\n**Content to cover:**\n- \n- \n- \n\n**Target audience:**\n',
    defaultPriority: 'low',
    defaultTags: ['documentation', 'writing'],
    suggestedDueDays: 5
  },
  {
    id: 'devops',
    name: 'DevOps Task',
    description: 'Infrastructure, deployment, or CI/CD work',
    icon: Wrench,
    category: 'operations',
    defaultTitle: 'DevOps: ',
    defaultDescription: '**Task type:**\n[ ] Deployment\n[ ] Infrastructure\n[ ] CI/CD Pipeline\n[ ] Monitoring\n\n**Objective:**\n\n\n**Requirements:**\n- \n- \n- \n\n**Rollback plan:**\n',
    defaultPriority: 'medium',
    defaultTags: ['devops', 'infrastructure'],
    suggestedDueDays: 4
  },
  {
    id: 'security',
    name: 'Security Task',
    description: 'Security audit, vulnerability fix, or hardening',
    icon: ShieldCheck,
    category: 'operations',
    defaultTitle: 'Security: ',
    defaultDescription: '**Security concern:**\n\n\n**Impact:**\n[ ] Critical\n[ ] High\n[ ] Medium\n[ ] Low\n\n**Affected systems:**\n\n\n**Mitigation steps:**\n1. \n2. \n3. \n\n**Verification:**\n',
    defaultPriority: 'critical',
    defaultTags: ['security', 'urgent'],
    suggestedDueDays: 1
  },
  {
    id: 'testing',
    name: 'Testing',
    description: 'Write tests or perform QA testing',
    icon: Lightning,
    category: 'development',
    defaultTitle: 'Test: ',
    defaultDescription: '**Test type:**\n[ ] Unit Tests\n[ ] Integration Tests\n[ ] E2E Tests\n[ ] Manual QA\n\n**Features to test:**\n- \n- \n- \n\n**Test scenarios:**\n1. \n2. \n3. \n\n**Success criteria:**\n',
    defaultPriority: 'medium',
    defaultTags: ['testing', 'qa'],
    suggestedDueDays: 3
  },
  {
    id: 'ui-design',
    name: 'UI/UX Design',
    description: 'Design interface or user experience',
    icon: PaintBrush,
    category: 'design',
    defaultTitle: 'Design: ',
    defaultDescription: '**Design scope:**\n\n\n**User goals:**\n- \n- \n- \n\n**Design requirements:**\n- [ ] Wireframes\n- [ ] High-fidelity mockups\n- [ ] Prototype\n- [ ] Design system components\n\n**Deliverables:**\n',
    defaultPriority: 'medium',
    defaultTags: ['design', 'ui', 'ux'],
    suggestedDueDays: 5
  },
  {
    id: 'database',
    name: 'Database Task',
    description: 'Database migration, optimization, or schema change',
    icon: Database,
    category: 'operations',
    defaultTitle: 'Database: ',
    defaultDescription: '**Task type:**\n[ ] Migration\n[ ] Schema Change\n[ ] Optimization\n[ ] Backup/Restore\n\n**Objective:**\n\n\n**Impact analysis:**\n\n\n**Migration steps:**\n1. \n2. \n3. \n\n**Rollback plan:**\n',
    defaultPriority: 'high',
    defaultTags: ['database', 'backend'],
    suggestedDueDays: 3
  },
  {
    id: 'release',
    name: 'Release',
    description: 'Prepare and deploy a release',
    icon: Rocket,
    category: 'operations',
    defaultTitle: 'Release: ',
    defaultDescription: '**Release version:**\n\n\n**Release checklist:**\n- [ ] All features tested\n- [ ] Documentation updated\n- [ ] Release notes prepared\n- [ ] Stakeholders notified\n- [ ] Rollback plan ready\n\n**Key changes:**\n- \n- \n- \n\n**Deployment window:**\n',
    defaultPriority: 'high',
    defaultTags: ['release', 'deployment'],
    suggestedDueDays: 7
  }
]

export const templateCategories = [
  { id: 'all', name: 'All Templates' },
  { id: 'development', name: 'Development' },
  { id: 'operations', name: 'Operations' },
  { id: 'design', name: 'Design' },
  { id: 'documentation', name: 'Documentation' }
] as const

export function getTemplatesByCategory(category: string): TaskTemplate[] {
  if (category === 'all') return taskTemplates
  return taskTemplates.filter(t => t.category === category)
}

export function getTemplateById(id: string): TaskTemplate | undefined {
  return taskTemplates.find(t => t.id === id)
}

export function calculateDueDate(daysFromNow: number): string {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString().split('T')[0]
}

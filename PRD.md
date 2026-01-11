# Planning Guide

A comprehensive team collaboration and task management platform for distributed teams to coordinate work, track progress, manage permissions, and maintain clear communication.

**Experience Qualities**:
1. **Organized** - Clear task hierarchies, intuitive navigation, and structured team views that make complex project management feel simple
2. **Collaborative** - Real-time activity tracking, contextual comments, and team visibility features that foster coordination
3. **Empowering** - Flexible access controls, customizable workflows, and powerful features that adapt to different team structures and needs

**Complexity Level**: Light Application (multiple features with basic state)
A focused task management and team coordination tool with kanban boards, calendar views, commenting system, and role-based permissions. Users manage tasks through drag-and-drop, track deadlines via calendar, collaborate via comments, and control access through a permission system.

## Essential Features

**Task Management Kanban Board**
- Functionality: Drag-and-drop kanban board with four status columns (To Do, In Progress, Review, Done), visual priority indicators, assignee avatars, due date badges, dependency tracking, and status updates
- Purpose: Visual task organization and workflow management with flexible ordering
- Trigger: Navigate to Tasks tab or default view
- Progression: View tasks organized by status → Filter by assignee/priority/due date → Drag tasks to reorder within columns → Click task to view/edit dependencies → Update task status via dropdown → Add new tasks via Create button
- Success criteria: Tasks persist across sessions, drag-and-drop smooth and responsive, filters work correctly, blocked tasks clearly indicated

**Task Priority & Custom Ordering**
- Functionality: Toggle between automatic priority sorting (Critical > High > Medium > Low) and manual drag-and-drop custom ordering with per-status persistence
- Purpose: Enable teams to organize tasks by urgency or by custom workflow needs
- Trigger: Priority sort toggle switch in Tasks view
- Progression: View tasks in default order → Enable priority sorting to auto-sort by urgency → Disable to enable drag-and-drop → Manually reorder within status columns → Order persists per status across sessions
- Success criteria: Toggle works smoothly with feedback, custom order saves per column, priority sorting accurate

**Task Dependencies & Gantt Chart**
- Functionality: Define dependencies between tasks, detect circular references, visualize project timeline in Gantt chart with dependency arrows and critical path highlighting
- Purpose: Manage complex project workflows and identify task relationships that affect scheduling
- Trigger: Click task card to open dependencies dialog, or view Gantt chart in Roadmap
- Progression: Open task → Add dependencies from task list → System validates (no circular refs) → See blocked indicators on dependent tasks → View Gantt chart → See dependency arrows → Identify critical path → Zoom timeline → Export to calendar
- Success criteria: Dependency validation works, blocked tasks show indicators, Gantt chart renders correctly, dependency arrows display, critical path identifiable

**Calendar View & Export**
- Functionality: Month/week calendar visualization of task deadlines with color coding, overdue indicators, multi-task day badges, and export to iCal/Google Calendar
- Purpose: Visualize project timeline and integrate with external calendar applications
- Trigger: Navigate to Calendar tab
- Progression: View current month → Navigate months → Click date to see tasks → Filter by assignee → Export full calendar or single day → Download iCal file → Import to Apple Calendar/Outlook → Or quick-add to Google Calendar
- Success criteria: Calendar displays correctly, filters work, exports generate valid iCal files, Google Calendar integration works

**Team Collaboration Hub**
- Functionality: Comment threads with context (general or service-related), activity feeds, team member status tracking, and comment resolution
- Purpose: Enable discussion and feedback tracking across the project
- Trigger: Navigate to Comments tab or Overview activity feed
- Progression: Select context → Write comment → Post → Comments appear in activity feed → Other members view and respond → Mark as resolved when addressed
- Success criteria: Comments persist, activity feed updates, context filtering works, resolve functionality works

**Team Member Management**
- Functionality: Add/edit/remove team members with roles (Architect, Developer, DevOps, Product), access levels (Owner, Admin, Member, Viewer), and online status tracking
- Purpose: Maintain team roster with appropriate access controls and clear role definitions
- Trigger: Navigate to Team tab, click Add Member or edit existing member
- Progression: Admin opens add dialog → Enter name/email → Select role → Choose access level → System shows granted permissions → Save → Member appears in team grid → Stats track (tasks, comments) → Toggle online status → Edit permissions later as needed
- Success criteria: CRUD operations work, permission system enforces access, stats calculate correctly

**Role-Based Access Control**
- Functionality: Four-tier permission system with 14 granular permissions across team management, tasks, comments, architecture, and data access
- Purpose: Secure operations and provide appropriate access for different team member roles
- Trigger: Set on member creation, checked on all protected actions, viewable in permission dialogs
- Progression: User attempts action → System checks access level and permissions → Allow or deny with feedback → User views own permissions in overview → Admin views any member permissions → Admin modifies access level → Permissions update immediately
- Success criteria: All permission checks enforce correctly, clear denial feedback, permission viewing works, no unauthorized actions possible

**Access Levels:**
- **Owner** (👑): Full system access - all 14 permissions
- **Admin** (⚡): Team and content management - 13 permissions (cannot modify owner access levels)
- **Member** (✓): Standard collaboration - create/assign tasks, comment, view analytics, export data
- **Viewer** (👁️): Read-only - can only create comments

**Permission Categories:**
- Team Management: manage_team, manage_roles, manage_permissions
- Task Management: create_tasks, assign_tasks, delete_tasks, edit_all_tasks
- Collaboration: create_comments, delete_comments
- Architecture: manage_services, manage_workflows, manage_roadmap
- Data & Analytics: view_analytics, export_data

## Edge Case Handling

- **Unassigned Tasks**: Tasks without assignees display "Unassigned" and are visible in assignee filter
- **Tasks Without Due Dates**: Calendar view shows these in "Upcoming Tasks" sidebar
- **Overdue Tasks**: Prominently highlighted in red across all views
- **Drag-and-Drop Conflicts**: Dragging disabled when priority sort enabled with clear feedback
- **Task Order Persistence**: Custom order saved per status column in KV storage
- **Empty States**: Helpful CTAs when no tasks, comments, or team members exist
- **Circular Dependencies**: Validation prevents circular references with error feedback
- **Blocked Tasks**: Visual indicators when dependencies incomplete
- **Dependency Deletion**: Removing a task updates all dependency references
- **Permission Denials**: Clear error messages explaining required permissions
- **Access Level Changes**: Take effect immediately without re-login
- **Self-Permission Editing**: Users can view but not modify their own access level
- **Last Owner Protection**: Cannot remove last owner to prevent lockout
- **Large Task Lists**: Calendar export handles large datasets with progress feedback
- **Invalid Exports**: Clear error messages when export fails
- **Offline Members**: Display offline status while preserving task/comment history
- **Mobile Layout**: Responsive cards, stacked columns, touch-friendly targets

## Design Direction

The design should feel organized, welcoming, and empowering - a tool that helps teams work better together. Professional enough for enterprise use but approachable enough for small teams. Visual hierarchy makes dense information scannable, with clear status indicators and intuitive interactions. The interface should reduce cognitive load while providing powerful functionality.

## Color Selection

Clean, professional palette with vibrant accents for status and interactive elements.

- **Primary Color**: Deep Navy Blue (oklch(0.35 0.05 250)) - Professional, trustworthy foundation for headers and primary actions
- **Secondary Colors**: Steel Gray (oklch(0.55 0.02 250)) for supporting elements; Cool White (oklch(0.98 0.005 250)) for backgrounds
- **Accent Color**: Electric Cyan (oklch(0.70 0.15 200)) - Modern, friendly highlight for interactive elements and active states
- **Foreground/Background Pairings**: 
  - Background (Cool White oklch(0.98 0.005 250)): Dark Navy text (oklch(0.25 0.05 250)) - Ratio 11.2:1 ✓
  - Primary (Deep Navy oklch(0.35 0.05 250)): White text (oklch(1 0 0)) - Ratio 8.7:1 ✓
  - Accent (Electric Cyan oklch(0.70 0.15 200)): Dark Navy text (oklch(0.25 0.05 250)) - Ratio 6.8:1 ✓
  - Card (Steel Gray oklch(0.55 0.02 250)): White text (oklch(1 0 0)) - Ratio 5.2:1 ✓

## Font Selection

Readable, modern typography that balances personality with professionalism.

- **Typographic Hierarchy**: 
  - H1 (Page Title): Space Grotesk Bold / 28px / tight tracking - Main header
  - H2 (Section Headers): Space Grotesk SemiBold / 24px / normal tracking - Tab content titles
  - H3 (Card Titles): Space Grotesk Medium / 18px / normal tracking - Component headers
  - Body Text: Inter Regular / 15px / relaxed line-height (1.6) - Maximum readability
  - Labels: Inter Medium / 14px / normal tracking - Form labels, badges
  - Captions: Inter Regular / 13px / wide tracking (0.01em) / text-muted-foreground - Timestamps, metadata

## Animations

Purposeful motion that enhances understanding without distraction.

Smooth card hover effects (subtle lift + shadow), drag-and-drop with visual feedback (ghost element + drop zone highlights), tab transitions (quick fade), dialog/drawer slide-in animations, status badge color transitions, and gentle pulse on new activity indicators. Keep durations fast (150-250ms) to maintain snappy feel.

## Component Selection

- **Components**: 
  - Card: Primary container for tasks, team members, activity with hover states
  - Tabs: Main navigation (Overview, Tasks, Calendar, Comments, Team)
  - Dialog: Task creation, member management, permissions viewing
  - Badge: Priority levels, status indicators, access levels, roles
  - Tooltip: Contextual help and additional information
  - ScrollArea: Long lists of tasks, comments, team members
  - Select: Filters, assignee selection, status updates
  - Switch: Priority sort toggle, online status
  - Textarea: Comment composition, task descriptions
  - Avatar: Team member identification throughout UI
  - Button: Actions with clear hierarchy (primary, secondary, ghost)
  
- **Customizations**: 
  - Sortable task cards with drag handles using @dnd-kit
  - Custom calendar grid with multi-task day indicators
  - Permission breakdown displays with category grouping
  - Activity feed with timestamp formatting
  
- **States**: 
  - Buttons: Scale on hover, darker on active, disabled with reduced opacity
  - Task Cards: Lift on hover, shadow increase, border highlight when blocked
  - Drag-and-drop: Ghost element during drag, drop zone highlights, smooth reordering
  
- **Icon Selection**: 
  - @phosphor-icons/react: Users, CheckSquare, ChatCircleDots, CalendarBlank, ShieldCheck, FlagBanner, GitBranch, Plus, DotsThree, CheckCircle, Clock, Lock, Tag, DotsSixVertical
  - Use duotone weight for feature icons in headers, regular for inline usage
  
- **Spacing**: 
  - Consistent gap-6 between sections, gap-4 for card grids, gap-2 for inline elements
  - Card padding: p-6 for main cards, p-4 for compact cards, p-3 for nested content
  - Page margins: max-w-7xl mx-auto
  
- **Mobile**: 
  - Single column task board (stacked status columns)
  - Tabs convert to full-width stacked buttons
  - Calendar switches to week view on mobile
  - Dialogs become full-screen sheets
  - Team grid becomes single column
  - Touch-friendly drag handles and buttons (min 44px)

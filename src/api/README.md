# API Integration Guide

This document describes the modular API integration layer for connecting the frontend UI with the backend server.

## Architecture Overview

```
src/
├── api/
│   ├── client.ts          # HTTP client with interceptors
│   ├── config.ts          # Environment configuration
│   ├── index.ts           # Public exports
│   └── services/
│       ├── auth.service.ts    # Authentication endpoints
│       ├── task.service.ts    # Task management endpoints
│       ├── comment.service.ts # Comment endpoints
│       ├── team.service.ts    # Team member endpoints
│       └── data.service.ts    # Statistics & backup endpoints
├── contexts/
│   ├── AuthContext.tsx    # Authentication state management
│   ├── DataContext.tsx    # Application data management
│   └── index.ts           # Public exports
├── hooks/
│   ├── useApi.ts          # Base API hooks
│   ├── useTasks.ts        # Task management hook
│   ├── useComments.ts     # Comment management hook
│   ├── useTeamMembers.ts  # Team management hook
│   └── index.ts           # Public exports
└── components/
    └── auth/
        ├── AuthPage.tsx   # Login/Register components
        └── index.ts       # Public exports
```

## Setup

1. Copy `.env.example` to `.env` and configure:
   ```bash
   VITE_API_URL=http://localhost:5000/api/v1
   ```

2. Start the backend server (see `/server` directory)

3. Start the frontend:
   ```bash
   npm run dev
   ```

## Usage

### Authentication

```tsx
import { useAuth } from '@/contexts';

function MyComponent() {
  const { user, isAuthenticated, login, logout, register } = useAuth();

  const handleLogin = async () => {
    const success = await login({ email: 'user@example.com', password: 'password' });
    if (success) {
      console.log('Logged in!');
    }
  };

  return (
    <div>
      {isAuthenticated ? (
        <p>Welcome, {user?.name}</p>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  );
}
```

### Tasks

```tsx
import { useTasks } from '@/hooks';

function TaskList() {
  const {
    tasks,
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    refresh,
  } = useTasks();

  const handleCreateTask = async () => {
    const result = await createTask({
      title: 'New Task',
      description: 'Task description',
      priority: 'medium',
    });
    if (result.success) {
      console.log('Task created:', result.data);
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <ul>
      {tasks.map(task => (
        <li key={task.id}>{task.title}</li>
      ))}
    </ul>
  );
}
```

### Comments

```tsx
import { useComments } from '@/hooks';

function CommentSection({ contextType, contextId }) {
  const {
    comments,
    isLoading,
    createComment,
    toggleResolve,
    addReaction,
  } = useComments({ contextType, contextId });

  const handleAddComment = async (content: string) => {
    await createComment({
      content,
      contextType,
      contextId,
    });
  };

  return (
    <div>
      {comments.map(comment => (
        <div key={comment.id}>{comment.content}</div>
      ))}
    </div>
  );
}
```

### Team Members

```tsx
import { useTeamMembers } from '@/hooks';

function TeamList() {
  const {
    members,
    onlineMembers,
    isLoading,
    updateRole,
    updateAccessLevel,
  } = useTeamMembers();

  return (
    <div>
      <h3>Online ({onlineMembers.length})</h3>
      <ul>
        {members.map(member => (
          <li key={member.id}>{member.name} - {member.role}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Dashboard Statistics

```tsx
import { useData } from '@/contexts';

function Dashboard() {
  const { statistics, isLoadingStats, fetchStatistics } = useData();

  return (
    <div>
      {statistics && (
        <>
          <p>Total Tasks: {statistics.tasks.total}</p>
          <p>Overdue: {statistics.tasks.overdue}</p>
          <p>Team Online: {statistics.teamMembers.online}</p>
        </>
      )}
    </div>
  );
}
```

## API Client Features

### Automatic Token Refresh
The API client automatically handles token refresh when access tokens expire.

### Request/Response Interceptors
- Automatically adds Authorization header
- Handles 401 responses with token refresh
- Transforms API responses to consistent format

### Error Handling
```tsx
import { ApiError } from '@/api';

try {
  await taskService.createTask(data);
} catch (error) {
  if (error instanceof ApiError) {
    console.log(error.status); // HTTP status code
    console.log(error.message); // Error message
  }
}
```

## Direct Service Access

For advanced use cases, you can access services directly:

```tsx
import { taskService, commentService, teamService, authService } from '@/api';

// Direct API calls
const response = await taskService.getTasks({ status: 'in-progress' });
if (response.success) {
  console.log(response.data);
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:5000/api/v1` |

## Backend API Endpoints Expected

The frontend expects these endpoints from the backend:

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user
- `PUT /auth/profile` - Update profile
- `PUT /auth/change-password` - Change password

### Tasks
- `GET /tasks` - List tasks (with filters)
- `GET /tasks/:id` - Get single task
- `POST /tasks` - Create task
- `PUT /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task
- `PATCH /tasks/:id/status` - Update task status
- `PATCH /tasks/:id/dependencies` - Update dependencies

### Comments
- `GET /comments` - List comments (with filters)
- `POST /comments` - Create comment
- `PUT /comments/:id` - Update comment
- `DELETE /comments/:id` - Delete comment
- `PATCH /comments/:id/resolve` - Toggle resolve
- `POST /comments/:id/reactions` - Add reaction
- `POST /comments/:id/replies` - Add reply

### Team
- `GET /team` - List team members
- `POST /team` - Create team member
- `PUT /team/:id` - Update team member
- `DELETE /team/:id` - Delete team member
- `PATCH /team/:id/role` - Update role
- `PATCH /team/:id/access-level` - Update access level

### Data
- `GET /data/statistics` - Dashboard statistics
- `GET /data/activity` - Activity timeline
- `GET /data/export` - Export all data
- `POST /data/import` - Import data
- `GET /data/backups` - List backups
- `POST /data/backups` - Create backup
- `POST /data/backups/:id/restore` - Restore backup

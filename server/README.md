# Team Collaboration Hub - Backend Server

A robust, production-ready backend server for the Team Collaboration Hub application built with Node.js, Express, TypeScript, and MongoDB.

## Features

- 🔐 **JWT Authentication** - Secure token-based authentication with refresh tokens
- 👥 **Team Management** - Full CRUD for team members with role-based access control
- 📋 **Task Management** - Create, update, delete, and filter tasks with dependencies
- 💬 **Comments System** - Threaded comments with reactions and mentions
- 📊 **Analytics & Statistics** - Comprehensive dashboard statistics and workload analysis
- 🔒 **Permission System** - Granular permissions based on access levels (owner, admin, member, viewer)
- 💾 **Data Management** - Export/import functionality and automatic backups
- 📝 **Activity Logging** - Track all user activities with automatic cleanup

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: express-validator
- **Security**: helmet, cors, rate-limiting
- **Logging**: Winston

## Getting Started

### Prerequisites

- Node.js 18 or higher
- MongoDB 6.0 or higher (local or MongoDB Atlas)
- npm or yarn

### Installation

1. **Navigate to the server directory**
   ```bash
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration.

4. **Start MongoDB** (if running locally)
   ```bash
   mongod
   ```

5. **Seed the database** (optional)
   ```bash
   npm run seed
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

The server will start at `http://localhost:5000`.

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login user |
| POST | `/api/v1/auth/logout` | Logout user |
| POST | `/api/v1/auth/refresh-token` | Refresh access token |
| GET | `/api/v1/auth/me` | Get current user |
| PUT | `/api/v1/auth/profile` | Update profile |
| PUT | `/api/v1/auth/change-password` | Change password |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/tasks` | Get all tasks (with filters) |
| GET | `/api/v1/tasks/:id` | Get single task |
| POST | `/api/v1/tasks` | Create task |
| PUT | `/api/v1/tasks/:id` | Update task |
| DELETE | `/api/v1/tasks/:id` | Delete task |
| PATCH | `/api/v1/tasks/:id/status` | Update task status |
| PATCH | `/api/v1/tasks/:id/dependencies` | Update dependencies |
| POST | `/api/v1/tasks/bulk-update` | Bulk update tasks |

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/comments` | Get all comments |
| GET | `/api/v1/comments/:id` | Get single comment |
| POST | `/api/v1/comments` | Create comment |
| PUT | `/api/v1/comments/:id` | Update comment |
| DELETE | `/api/v1/comments/:id` | Delete comment |
| PATCH | `/api/v1/comments/:id/resolve` | Toggle resolve status |
| POST | `/api/v1/comments/:id/reactions` | Add reaction |
| DELETE | `/api/v1/comments/:id/reactions` | Remove reaction |
| POST | `/api/v1/comments/:id/replies` | Add reply |

### Team Members
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/team` | Get all team members |
| GET | `/api/v1/team/:id` | Get single member |
| POST | `/api/v1/team` | Create member |
| PUT | `/api/v1/team/:id` | Update member |
| DELETE | `/api/v1/team/:id` | Delete member |
| PATCH | `/api/v1/team/:id/status` | Update online status |
| PATCH | `/api/v1/team/:id/role` | Update role |
| PATCH | `/api/v1/team/:id/access-level` | Update access level |
| PATCH | `/api/v1/team/:id/permissions` | Update custom permissions |

### Data Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/data/statistics` | Get dashboard statistics |
| GET | `/api/v1/data/workload` | Get workload stats |
| GET | `/api/v1/data/activity` | Get activity timeline |
| GET | `/api/v1/data/export` | Export all data |
| POST | `/api/v1/data/import` | Import data |
| GET | `/api/v1/data/backups` | List backups |
| POST | `/api/v1/data/backups` | Create backup |
| POST | `/api/v1/data/backups/:id/restore` | Restore backup |
| DELETE | `/api/v1/data/backups/:id` | Delete backup |

## Query Parameters

### Pagination
All list endpoints support pagination:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `sortBy` - Field to sort by
- `sortOrder` - Sort order: `asc` or `desc`

### Task Filters
- `status` - Filter by status: `todo`, `in-progress`, `review`, `done`
- `priority` - Filter by priority: `low`, `medium`, `high`, `critical`
- `assigneeId` - Filter by assignee
- `creatorId` - Filter by creator
- `contextType` - Filter by context: `service`, `workflow`, `roadmap`, `general`
- `dueDate` - Filter by due date: `overdue`, `today`, `this-week`, `no-due-date`
- `tags` - Filter by tags (array)
- `search` - Full-text search on title and description

## Permission System

### Access Levels
| Level | Permissions |
|-------|-------------|
| **Owner** | Full system access |
| **Admin** | Manage team, full task/comment access, manage architecture |
| **Member** | Create tasks, assign tasks, create comments, view analytics |
| **Viewer** | Read-only with comment capability |

## Scripts

```bash
npm run dev       # Start development server with hot-reload
npm run build     # Build for production
npm run start     # Start production server
npm run seed      # Seed database with sample data
npm run lint      # Run ESLint
npm run test      # Run tests
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `5000` |
| `MONGO_URL` | MongoDB connection string | `mongodb://localhost:27017/team_hub` |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_REFRESH_SECRET` | Refresh token secret | - |
| `JWT_EXPIRES_IN` | Access token expiry | `1h` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `7d` |
| `CORS_ORIGIN` | Allowed CORS origins | `http://localhost:5173` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

## Test Credentials

After running `npm run seed`:
- **Email**: sarah.chen@example.com
- **Password**: password123

## License

MIT

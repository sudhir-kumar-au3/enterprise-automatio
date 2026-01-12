// API Client
export { apiClient, ApiError } from "./client";
export type { ApiResponse } from "./client";

// Configuration
export { config } from "./config";

// Services
export { authService } from "./services/auth.service";
export { taskService } from "./services/task.service";
export { commentService } from "./services/comment.service";
export { teamService } from "./services/team.service";
export { dataService } from "./services/data.service";

// Service Types
export type {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  ChangePasswordData,
} from "./services/auth.service";

export type {
  TaskFilters,
  CreateTaskData,
  UpdateTaskData,
} from "./services/task.service";

export type {
  CommentFilters,
  CreateCommentData,
  UpdateCommentData,
} from "./services/comment.service";

export type {
  TeamMemberFilters,
  CreateTeamMemberData,
  UpdateTeamMemberData,
} from "./services/team.service";

export type {
  DashboardStatistics,
  WorkloadStats,
  ActivityItem,
  Backup,
  ExportData,
} from "./services/data.service";

import apiClient, { ApiResponse } from "../client";
import type { Task } from "../../lib/collaboration-data";

export interface TaskFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  status?: Task["status"];
  priority?: Task["priority"];
  assigneeId?: string;
  creatorId?: string;
  contextType?: Task["contextType"];
  contextId?: string;
  dueDate?: "overdue" | "today" | "this-week" | "no-due-date";
  tags?: string[];
  search?: string;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  status?: Task["status"];
  priority?: Task["priority"];
  assigneeId?: string;
  contextType?: Task["contextType"];
  contextId?: string;
  dueDate?: number;
  tags?: string[];
  dependencies?: string[];
}

export interface UpdateTaskData extends Partial<CreateTaskData> {}

export interface TasksResponse {
  tasks: Task[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const taskService = {
  async getTasks(filters?: TaskFilters): Promise<ApiResponse<Task[]>> {
    return apiClient.get<Task[]>("/tasks", filters);
  },

  async getTask(id: string): Promise<ApiResponse<Task>> {
    return apiClient.get<Task>(`/tasks/${id}`);
  },

  async createTask(data: CreateTaskData): Promise<ApiResponse<Task>> {
    return apiClient.post<Task>("/tasks", data);
  },

  async updateTask(
    id: string,
    data: UpdateTaskData
  ): Promise<ApiResponse<Task>> {
    return apiClient.put<Task>(`/tasks/${id}`, data);
  },

  async deleteTask(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/tasks/${id}`);
  },

  async updateTaskStatus(
    id: string,
    status: Task["status"]
  ): Promise<ApiResponse<Task>> {
    return apiClient.patch<Task>(`/tasks/${id}/status`, { status });
  },

  async updateTaskDependencies(
    id: string,
    dependencies: string[]
  ): Promise<ApiResponse<Task>> {
    return apiClient.patch<Task>(`/tasks/${id}/dependencies`, { dependencies });
  },

  async bulkUpdateTasks(
    updates: Array<{ id: string; data: UpdateTaskData }>
  ): Promise<ApiResponse<Task[]>> {
    return apiClient.post<Task[]>("/tasks/bulk-update", { updates });
  },

  async getMyTasks(
    filters?: Omit<TaskFilters, "assigneeId">
  ): Promise<ApiResponse<Task[]>> {
    return apiClient.get<Task[]>("/tasks/my-tasks", filters);
  },
};

export default taskService;

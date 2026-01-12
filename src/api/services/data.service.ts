import apiClient, { ApiResponse } from "../client";
import type {
  Task,
  Comment,
  TeamMember,
  Activity,
} from "../../lib/collaboration-data";

export interface DashboardStatistics {
  tasks: {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    overdue: number;
    dueSoon: number;
    completedThisWeek: number;
  };
  comments: {
    total: number;
    resolved: number;
    unresolved: number;
  };
  teamMembers: {
    total: number;
    online: number;
  };
}

export interface WorkloadStats {
  memberId: string;
  memberName: string;
  tasksAssigned: number;
  tasksCompleted: number;
  tasksByPriority: Record<string, number>;
}

export interface ActivityItem {
  id: string;
  userId: string;
  type: string;
  timestamp: number;
  contextType: string;
  contextId: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface Backup {
  id: string;
  timestamp: number;
  userId: string;
  type: "manual" | "automatic";
}

export interface ExportData {
  version: string;
  exportDate: number;
  tasks: Task[];
  comments: Comment[];
  teamMembers: TeamMember[];
}

export const dataService = {
  async getStatistics(): Promise<ApiResponse<DashboardStatistics>> {
    return apiClient.get<DashboardStatistics>("/data/statistics");
  },

  async getWorkloadStats(): Promise<ApiResponse<WorkloadStats[]>> {
    return apiClient.get<WorkloadStats[]>("/data/workload");
  },

  async getActivityTimeline(params?: {
    page?: number;
    limit?: number;
    userId?: string;
    type?: string;
  }): Promise<ApiResponse<ActivityItem[]>> {
    return apiClient.get<ActivityItem[]>("/data/activity", params);
  },

  async exportData(): Promise<ApiResponse<ExportData>> {
    return apiClient.get<ExportData>("/data/export");
  },

  async importData(
    data: ExportData
  ): Promise<
    ApiResponse<{
      imported: { tasks: number; comments: number; teamMembers: number };
    }>
  > {
    return apiClient.post("/data/import", data);
  },

  async getBackups(): Promise<ApiResponse<Backup[]>> {
    return apiClient.get<Backup[]>("/data/backups");
  },

  async createBackup(): Promise<ApiResponse<Backup>> {
    return apiClient.post<Backup>("/data/backups");
  },

  async restoreBackup(id: string): Promise<ApiResponse<void>> {
    return apiClient.post(`/data/backups/${id}/restore`);
  },

  async deleteBackup(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/data/backups/${id}`);
  },
};

export default dataService;

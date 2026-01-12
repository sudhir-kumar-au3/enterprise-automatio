import apiClient, { ApiResponse } from "../client";
import type {
  TeamMember,
  AccessLevel,
  Permission,
} from "../../lib/collaboration-data";

export interface TeamMemberFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  role?: TeamMember["role"];
  accessLevel?: AccessLevel;
  isOnline?: boolean;
  search?: string;
}

export interface CreateTeamMemberData {
  name: string;
  email: string;
  password: string;
  role?: TeamMember["role"];
  accessLevel?: AccessLevel;
}

export interface UpdateTeamMemberData {
  name?: string;
  email?: string;
  role?: TeamMember["role"];
  accessLevel?: AccessLevel;
  avatarUrl?: string;
}

export const teamService = {
  async getTeamMembers(
    filters?: TeamMemberFilters
  ): Promise<ApiResponse<TeamMember[]>> {
    return apiClient.get<TeamMember[]>("/team", filters);
  },

  async getTeamMember(id: string): Promise<ApiResponse<TeamMember>> {
    return apiClient.get<TeamMember>(`/team/${id}`);
  },

  async createTeamMember(
    data: CreateTeamMemberData
  ): Promise<ApiResponse<TeamMember>> {
    return apiClient.post<TeamMember>("/team", data);
  },

  async updateTeamMember(
    id: string,
    data: UpdateTeamMemberData
  ): Promise<ApiResponse<TeamMember>> {
    return apiClient.put<TeamMember>(`/team/${id}`, data);
  },

  async deleteTeamMember(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/team/${id}`);
  },

  async updateOnlineStatus(
    id: string,
    isOnline: boolean
  ): Promise<ApiResponse<TeamMember>> {
    return apiClient.patch<TeamMember>(`/team/${id}/status`, { isOnline });
  },

  async updateMemberRole(
    id: string,
    role: TeamMember["role"]
  ): Promise<ApiResponse<TeamMember>> {
    return apiClient.patch<TeamMember>(`/team/${id}/role`, { role });
  },

  async updateAccessLevel(
    id: string,
    accessLevel: AccessLevel
  ): Promise<ApiResponse<TeamMember>> {
    return apiClient.patch<TeamMember>(`/team/${id}/access-level`, {
      accessLevel,
    });
  },

  async updateCustomPermissions(
    id: string,
    customPermissions: Permission[]
  ): Promise<ApiResponse<TeamMember>> {
    return apiClient.patch<TeamMember>(`/team/${id}/permissions`, {
      customPermissions,
    });
  },
};

export default teamService;

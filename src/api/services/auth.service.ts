import apiClient, { ApiResponse } from "../client";
import config from "../config";
import type { TeamMember } from "../../lib/collaboration-data";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: "architect" | "developer" | "devops" | "product";
}

export interface AuthResponse {
  user: TeamMember;
  accessToken: string;
  refreshToken: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export const authService = {
  async login(
    credentials: LoginCredentials
  ): Promise<ApiResponse<AuthResponse>> {
    const response = await apiClient.post<AuthResponse>(
      "/auth/login",
      credentials
    );
    if (response.success && response.data) {
      apiClient.setAuthTokens(
        response.data.accessToken,
        response.data.refreshToken
      );
      localStorage.setItem(config.userKey, JSON.stringify(response.data.user));
    }
    return response;
  },

  async register(data: RegisterData): Promise<ApiResponse<AuthResponse>> {
    const response = await apiClient.post<AuthResponse>("/auth/register", data);
    if (response.success && response.data) {
      apiClient.setAuthTokens(
        response.data.accessToken,
        response.data.refreshToken
      );
      localStorage.setItem(config.userKey, JSON.stringify(response.data.user));
    }
    return response;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      apiClient.clearAuth();
    }
  },

  async getCurrentUser(): Promise<ApiResponse<TeamMember>> {
    return apiClient.get<TeamMember>("/auth/me");
  },

  async updateProfile(data: {
    name?: string;
    avatarUrl?: string;
  }): Promise<ApiResponse<TeamMember>> {
    const response = await apiClient.put<TeamMember>("/auth/profile", data);
    if (response.success && response.data) {
      localStorage.setItem(config.userKey, JSON.stringify(response.data));
    }
    return response;
  },

  async changePassword(data: ChangePasswordData): Promise<ApiResponse<void>> {
    return apiClient.put("/auth/change-password", data);
  },

  getStoredUser(): TeamMember | null {
    const stored = localStorage.getItem(config.userKey);
    return stored ? JSON.parse(stored) : null;
  },

  isAuthenticated(): boolean {
    return apiClient.isAuthenticated();
  },
};

export default authService;

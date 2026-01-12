import apiClient, { ApiResponse } from "../client";
import type { Comment } from "../../lib/collaboration-data";

export interface CommentFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  contextType?: Comment["contextType"];
  contextId?: string;
  authorId?: string;
  isResolved?: boolean;
}

export interface CreateCommentData {
  content: string;
  contextType: Comment["contextType"];
  contextId: string;
  mentions?: string[];
}

export interface UpdateCommentData {
  content: string;
}

export const commentService = {
  async getComments(filters?: CommentFilters): Promise<ApiResponse<Comment[]>> {
    return apiClient.get<Comment[]>("/comments", filters);
  },

  async getComment(id: string): Promise<ApiResponse<Comment>> {
    return apiClient.get<Comment>(`/comments/${id}`);
  },

  async createComment(data: CreateCommentData): Promise<ApiResponse<Comment>> {
    return apiClient.post<Comment>("/comments", data);
  },

  async updateComment(
    id: string,
    data: UpdateCommentData
  ): Promise<ApiResponse<Comment>> {
    return apiClient.put<Comment>(`/comments/${id}`, data);
  },

  async deleteComment(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/comments/${id}`);
  },

  async toggleResolve(id: string): Promise<ApiResponse<Comment>> {
    return apiClient.patch<Comment>(`/comments/${id}/resolve`);
  },

  async addReaction(id: string, emoji: string): Promise<ApiResponse<Comment>> {
    return apiClient.post<Comment>(`/comments/${id}/reactions`, { emoji });
  },

  async removeReaction(id: string): Promise<ApiResponse<Comment>> {
    return apiClient.delete<Comment>(`/comments/${id}/reactions`);
  },

  async addReply(
    id: string,
    data: { content: string; mentions?: string[] }
  ): Promise<ApiResponse<Comment>> {
    return apiClient.post<Comment>(`/comments/${id}/replies`, data);
  },
};

export default commentService;

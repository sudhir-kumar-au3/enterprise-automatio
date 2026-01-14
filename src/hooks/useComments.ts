import { useCallback, useEffect } from "react";
import {
  commentService,
  CommentFilters,
  CreateCommentData,
  UpdateCommentData,
} from "../api";
import { usePaginatedApi, useMutation } from "./useApi";
import type { Comment } from "../lib/collaboration-data";

export function useComments(initialFilters?: CommentFilters) {
  const {
    items: comments,
    pagination,
    isLoading,
    error,
    filters,
    fetchData,
    goToPage,
    updateFilters,
    refresh,
    updateItem,
    removeItem,
    addItem,
    setItems,
  } = usePaginatedApi<Comment, CommentFilters>(
    (params) => commentService.getComments(params),
    { initialLimit: 50 }
  );

  // Fetch on mount - always fetch comments
  useEffect(() => {
    fetchData(initialFilters);
  }, []);

  // Create comment mutation
  const createMutation = useMutation<Comment, [CreateCommentData]>((data) =>
    commentService.createComment(data)
  );

  // Update comment mutation
  const updateMutation = useMutation<Comment, [string, UpdateCommentData]>(
    (id, data) => commentService.updateComment(id, data)
  );

  // Delete comment mutation
  const deleteMutation = useMutation<void, [string]>((id) =>
    commentService.deleteComment(id)
  );

  // Toggle resolve mutation
  const resolveMutation = useMutation<Comment, [string]>((id) =>
    commentService.toggleResolve(id)
  );

  // Reaction mutations
  const addReactionMutation = useMutation<Comment, [string, string]>(
    (id, emoji) => commentService.addReaction(id, emoji)
  );

  const removeReactionMutation = useMutation<Comment, [string]>((id) =>
    commentService.removeReaction(id)
  );

  // Reply mutation
  const addReplyMutation = useMutation<
    Comment,
    [string, { content: string; mentions?: string[] }]
  >((id, data) => commentService.addReply(id, data));

  const createComment = useCallback(
    async (data: CreateCommentData) => {
      const result = await createMutation.mutate(data);
      if (result.success && result.data) {
        addItem(result.data);
      }
      return result;
    },
    [createMutation, addItem]
  );

  const updateComment = useCallback(
    async (id: string, data: UpdateCommentData) => {
      const result = await updateMutation.mutate(id, data);
      if (result.success && result.data) {
        updateItem(id, result.data);
      }
      return result;
    },
    [updateMutation, updateItem]
  );

  const deleteComment = useCallback(
    async (id: string) => {
      const result = await deleteMutation.mutate(id);
      if (result.success) {
        removeItem(id);
      }
      return result;
    },
    [deleteMutation, removeItem]
  );

  const toggleResolve = useCallback(
    async (id: string) => {
      const result = await resolveMutation.mutate(id);
      if (result.success && result.data) {
        updateItem(id, { isResolved: result.data.isResolved });
      }
      return result;
    },
    [resolveMutation, updateItem]
  );

  const addReaction = useCallback(
    async (id: string, emoji: string) => {
      const result = await addReactionMutation.mutate(id, emoji);
      if (result.success && result.data) {
        updateItem(id, { reactions: result.data.reactions });
      }
      return result;
    },
    [addReactionMutation, updateItem]
  );

  const removeReaction = useCallback(
    async (id: string) => {
      const result = await removeReactionMutation.mutate(id);
      if (result.success && result.data) {
        updateItem(id, { reactions: result.data.reactions });
      }
      return result;
    },
    [removeReactionMutation, updateItem]
  );

  const addReply = useCallback(
    async (id: string, data: { content: string; mentions?: string[] }) => {
      const result = await addReplyMutation.mutate(id, data);
      if (result.success && result.data) {
        // Add reply to the comments list
        addItem(result.data);
      }
      return result;
    },
    [addReplyMutation, addItem]
  );

  return {
    comments,
    pagination,
    isLoading,
    error,
    filters,
    // Actions
    fetchComments: fetchData,
    goToPage,
    updateFilters,
    refresh,
    createComment,
    updateComment,
    deleteComment,
    toggleResolve,
    addReaction,
    removeReaction,
    addReply,
    setComments: setItems,
    // Mutation states
    isCreating: createMutation.isLoading,
    isUpdating: updateMutation.isLoading,
    isDeleting: deleteMutation.isLoading,
    isAddingReaction: addReactionMutation.isLoading,
    isAddingReply: addReplyMutation.isLoading,
  };
}

export default useComments;

import { useCallback, useEffect } from "react";
import {
  taskService,
  TaskFilters,
  CreateTaskData,
  UpdateTaskData,
} from "../api";
import { usePaginatedApi, useMutation } from "./useApi";
import type { Task } from "../lib/collaboration-data";

export function useTasks(initialFilters?: TaskFilters) {
  const {
    items: tasks,
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
  } = usePaginatedApi<Task, TaskFilters>(
    (params) => taskService.getTasks(params),
    { initialLimit: 50 }
  );

  // Fetch on mount
  useEffect(() => {
    fetchData(initialFilters);
  }, []);

  // Create task mutation
  const createMutation = useMutation<Task, [CreateTaskData]>((data) =>
    taskService.createTask(data)
  );

  // Update task mutation
  const updateMutation = useMutation<Task, [string, UpdateTaskData]>(
    (id, data) => taskService.updateTask(id, data)
  );

  // Delete task mutation
  const deleteMutation = useMutation<void, [string]>((id) =>
    taskService.deleteTask(id)
  );

  // Status update mutation
  const statusMutation = useMutation<Task, [string, Task["status"]]>(
    (id, status) => taskService.updateTaskStatus(id, status)
  );

  const createTask = useCallback(
    async (data: CreateTaskData) => {
      const result = await createMutation.mutate(data);
      if (result.success && result.data) {
        addItem(result.data);
      }
      return result;
    },
    [createMutation, addItem]
  );

  const updateTask = useCallback(
    async (id: string, data: UpdateTaskData) => {
      const result = await updateMutation.mutate(id, data);
      if (result.success && result.data) {
        updateItem(id, result.data);
      }
      return result;
    },
    [updateMutation, updateItem]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      const result = await deleteMutation.mutate(id);
      if (result.success) {
        removeItem(id);
      }
      return result;
    },
    [deleteMutation, removeItem]
  );

  const updateTaskStatus = useCallback(
    async (id: string, status: Task["status"]) => {
      const result = await statusMutation.mutate(id, status);
      if (result.success && result.data) {
        updateItem(id, { status });
      }
      return result;
    },
    [statusMutation, updateItem]
  );

  return {
    tasks,
    pagination,
    isLoading,
    error,
    filters,
    // Actions
    fetchTasks: fetchData,
    goToPage,
    updateFilters,
    refresh,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    setTasks: setItems,
    // Mutation states
    isCreating: createMutation.isLoading,
    isUpdating: updateMutation.isLoading,
    isDeleting: deleteMutation.isLoading,
  };
}

export default useTasks;

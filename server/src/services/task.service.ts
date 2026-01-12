/**
 * Task Service Layer
 * Handles all business logic for task operations
 * Separates concerns from controllers for better testability
 */

import { Task, TaskDocument, Activity, TeamMember } from "../models";
import { AppError } from "../middleware";
import logger from "../utils/logger";
import { ITask, TaskStatus, TaskPriority } from "../types";

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  creatorId?: string;
  contextType?: string;
  dueDate?: "overdue" | "today" | "this-week" | "no-due-date";
  tags?: string[];
  search?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TaskCreateInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  creatorId: string;
  contextType?: string;
  contextId?: string;
  dueDate?: number;
  tags?: string[];
  dependencies?: string[];
}

export interface TaskUpdateInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  dueDate?: number | null;
  tags?: string[];
  dependencies?: string[];
}

class TaskService {
  /**
   * Get tasks with filtering and pagination
   */
  async getTasks(
    filters: TaskFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<TaskDocument>> {
    const query = this.buildFilterQuery(filters);
    const { page, limit, sortBy, sortOrder } = pagination;

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === "asc" ? 1 : -1,
    };

    const [tasks, total] = await Promise.all([
      Task.find(query).sort(sort).skip(skip).limit(limit).lean().exec(),
      Task.countDocuments(query),
    ]);

    return {
      data: tasks as unknown as TaskDocument[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single task by ID
   */
  async getTaskById(taskId: string): Promise<TaskDocument> {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new AppError("Task not found", 404);
    }
    return task;
  }

  /**
   * Create a new task with validation
   */
  async createTask(
    input: TaskCreateInput,
    userId: string
  ): Promise<TaskDocument> {
    // Validate dependencies exist
    if (input.dependencies?.length) {
      await this.validateDependencies(input.dependencies);
    }

    // Validate assignee exists
    if (input.assigneeId) {
      await this.validateAssignee(input.assigneeId);
    }

    const taskData = {
      ...input,
      creatorId: userId,
      status: input.status || "todo",
      priority: input.priority || "medium",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const task = await Task.create(taskData);

    // Log activity
    await this.logActivity({
      userId,
      type: "task-created",
      contextType: task.contextType,
      contextId: task._id.toString(),
      content: `Created task: ${task.title}`,
      metadata: { taskId: task._id.toString(), title: task.title },
    });

    logger.info(`Task created: ${task.title} by user ${userId}`);
    return task;
  }

  /**
   * Update an existing task
   */
  async updateTask(
    taskId: string,
    input: TaskUpdateInput,
    userId: string
  ): Promise<TaskDocument> {
    const task = await this.getTaskById(taskId);
    const oldStatus = task.status;
    const oldAssignee = task.assigneeId;

    // Validate dependencies if updating
    if (input.dependencies?.length) {
      await this.validateDependencies(input.dependencies, taskId);
    }

    // Validate assignee if updating
    if (input.assigneeId) {
      await this.validateAssignee(input.assigneeId);
    }

    const updateData = {
      ...input,
      updatedAt: Date.now(),
    };

    const updatedTask = await Task.findByIdAndUpdate(taskId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedTask) {
      throw new AppError("Task not found", 404);
    }

    // Log status change activity
    if (input.status && input.status !== oldStatus) {
      await this.logActivity({
        userId,
        type: input.status === "done" ? "task-completed" : "status-changed",
        contextType: task.contextType,
        contextId: taskId,
        content: `Changed status from ${oldStatus} to ${input.status}`,
        metadata: { taskId, oldStatus, newStatus: input.status },
      });
    }

    // Log assignment change activity
    if (input.assigneeId && input.assigneeId !== oldAssignee) {
      await this.logActivity({
        userId,
        type: "task-assigned",
        contextType: task.contextType,
        contextId: taskId,
        content: `Task assigned to ${input.assigneeId}`,
        metadata: { taskId, assigneeId: input.assigneeId },
      });
    }

    logger.info(`Task updated: ${taskId} by user ${userId}`);
    return updatedTask;
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string, userId: string): Promise<void> {
    const task = await this.getTaskById(taskId);

    // Check if other tasks depend on this one
    const dependentTasks = await Task.find({ dependencies: taskId });
    if (dependentTasks.length > 0) {
      throw new AppError(
        `Cannot delete task: ${dependentTasks.length} other task(s) depend on it`,
        400
      );
    }

    await Task.findByIdAndDelete(taskId);

    await this.logActivity({
      userId,
      type: "task-deleted",
      contextType: task.contextType,
      contextId: taskId,
      content: `Deleted task: ${task.title}`,
      metadata: { taskId, title: task.title },
    });

    logger.info(`Task deleted: ${task.title} by user ${userId}`);
  }

  /**
   * Update task status only
   */
  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    userId: string
  ): Promise<TaskDocument> {
    const validStatuses: TaskStatus[] = [
      "todo",
      "in-progress",
      "review",
      "done",
    ];
    if (!validStatuses.includes(status)) {
      throw new AppError("Invalid status", 400);
    }

    // Check for blocking dependencies
    if (status === "in-progress" || status === "done") {
      const task = await this.getTaskById(taskId);
      if (task.dependencies?.length) {
        const blockingDeps = await Task.find({
          _id: { $in: task.dependencies },
          status: { $ne: "done" },
        });
        if (blockingDeps.length > 0) {
          throw new AppError(
            `Cannot change status: ${blockingDeps.length} blocking dependency(ies) not completed`,
            400
          );
        }
      }
    }

    return this.updateTask(taskId, { status }, userId);
  }

  /**
   * Update task dependencies
   */
  async updateTaskDependencies(
    taskId: string,
    dependencies: string[],
    userId: string
  ): Promise<TaskDocument> {
    await this.validateDependencies(dependencies, taskId);
    return this.updateTask(taskId, { dependencies }, userId);
  }

  /**
   * Bulk update multiple tasks
   */
  async bulkUpdateTasks(
    taskIds: string[],
    updates: Partial<TaskUpdateInput>,
    userId: string
  ): Promise<{ modifiedCount: number }> {
    if (!taskIds.length) {
      throw new AppError("Task IDs array is required", 400);
    }

    const result = await Task.updateMany(
      { _id: { $in: taskIds } },
      { ...updates, updatedAt: Date.now() }
    );

    logger.info(`Bulk update: ${result.modifiedCount} tasks by user ${userId}`);
    return { modifiedCount: result.modifiedCount };
  }

  /**
   * Get task statistics for dashboard
   */
  async getTaskStatistics(): Promise<{
    total: number;
    byStatus: Record<TaskStatus, number>;
    byPriority: Record<TaskPriority, number>;
    overdue: number;
    dueSoon: number;
    unassigned: number;
  }> {
    const now = Date.now();
    const weekFromNow = now + 7 * 24 * 60 * 60 * 1000;

    const [total, statusCounts, priorityCounts, overdue, dueSoon, unassigned] =
      await Promise.all([
        Task.countDocuments(),
        Task.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        Task.aggregate([{ $group: { _id: "$priority", count: { $sum: 1 } } }]),
        Task.countDocuments({
          dueDate: { $lt: now },
          status: { $ne: "done" },
        }),
        Task.countDocuments({
          dueDate: { $gte: now, $lte: weekFromNow },
          status: { $ne: "done" },
        }),
        Task.countDocuments({ assigneeId: null }),
      ]);

    const byStatus = statusCounts.reduce(
      (acc, { _id, count }) => ({ ...acc, [_id]: count }),
      { todo: 0, "in-progress": 0, review: 0, done: 0 }
    );

    const byPriority = priorityCounts.reduce(
      (acc, { _id, count }) => ({ ...acc, [_id]: count }),
      { low: 0, medium: 0, high: 0, critical: 0 }
    );

    return { total, byStatus, byPriority, overdue, dueSoon, unassigned };
  }

  /**
   * Get workload distribution by team member
   */
  async getWorkloadByMember(): Promise<
    Array<{
      memberId: string;
      taskCount: number;
      byStatus: Record<string, number>;
    }>
  > {
    const workload = await Task.aggregate([
      { $match: { assigneeId: { $ne: null } } },
      {
        $group: {
          _id: { assigneeId: "$assigneeId", status: "$status" },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.assigneeId",
          taskCount: { $sum: "$count" },
          statusBreakdown: {
            $push: { status: "$_id.status", count: "$count" },
          },
        },
      },
    ]);

    return workload.map((item) => ({
      memberId: item._id,
      taskCount: item.taskCount,
      byStatus: item.statusBreakdown.reduce(
        (
          acc: Record<string, number>,
          { status, count }: { status: string; count: number }
        ) => ({
          ...acc,
          [status]: count,
        }),
        {}
      ),
    }));
  }

  // Private helper methods

  private buildFilterQuery(filters: TaskFilters): Record<string, any> {
    const query: Record<string, any> = {};
    const now = Date.now();

    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.assigneeId) query.assigneeId = filters.assigneeId;
    if (filters.creatorId) query.creatorId = filters.creatorId;
    if (filters.contextType) query.contextType = filters.contextType;
    if (filters.tags?.length) query.tags = { $in: filters.tags };

    // Due date filters
    if (filters.dueDate === "overdue") {
      query.dueDate = { $lt: now };
      query.status = { $ne: "done" };
    } else if (filters.dueDate === "today") {
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      query.dueDate = { $gte: now, $lte: endOfDay.getTime() };
    } else if (filters.dueDate === "this-week") {
      const endOfWeek = new Date();
      endOfWeek.setDate(endOfWeek.getDate() + 7);
      query.dueDate = { $gte: now, $lte: endOfWeek.getTime() };
    } else if (filters.dueDate === "no-due-date") {
      query.dueDate = null;
    }

    // Text search
    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    return query;
  }

  private async validateDependencies(
    dependencies: string[],
    excludeTaskId?: string
  ): Promise<void> {
    // Check for self-reference
    if (excludeTaskId && dependencies.includes(excludeTaskId)) {
      throw new AppError("Task cannot depend on itself", 400);
    }

    // Check all dependencies exist
    const existingTasks = await Task.find({ _id: { $in: dependencies } });
    if (existingTasks.length !== dependencies.length) {
      throw new AppError("One or more dependency tasks not found", 404);
    }

    // Check for circular dependencies
    if (excludeTaskId) {
      const hasCircular = await this.detectCircularDependency(
        excludeTaskId,
        dependencies
      );
      if (hasCircular) {
        throw new AppError("Circular dependency detected", 400);
      }
    }
  }

  private async detectCircularDependency(
    taskId: string,
    newDependencies: string[],
    visited: Set<string> = new Set()
  ): Promise<boolean> {
    if (visited.has(taskId)) return true;
    visited.add(taskId);

    for (const depId of newDependencies) {
      const depTask = await Task.findById(depId);
      if (!depTask?.dependencies?.length) continue;

      if (depTask.dependencies.includes(taskId)) return true;

      const hasCircular = await this.detectCircularDependency(
        taskId,
        depTask.dependencies.map((d) => d.toString()),
        new Set(visited)
      );
      if (hasCircular) return true;
    }

    return false;
  }

  private async validateAssignee(assigneeId: string): Promise<void> {
    const member = await TeamMember.findById(assigneeId);
    if (!member) {
      throw new AppError("Assignee not found", 404);
    }
  }

  private async logActivity(data: {
    userId: string;
    type: string;
    contextType?: string;
    contextId: string;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await Activity.create({
        ...data,
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error("Failed to log activity", error);
      // Don't throw - activity logging shouldn't break the main operation
    }
  }
}

// Export singleton instance
export const taskService = new TaskService();
export default taskService;

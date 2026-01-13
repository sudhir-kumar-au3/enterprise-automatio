import { Response } from "express";
import { validationResult } from "express-validator";
import mongoose from "mongoose";
import { Task, Activity } from "../models";
import { AuthenticatedRequest, ApiResponse, TaskFilterQuery } from "../types";
import { asyncHandler, AppError } from "../middleware";
import { cacheService } from "../services/cache.service";
import { wsService } from "../services/websocket.service";
import { jobQueue } from "../services/jobQueue.service";
import logger from "../utils/logger";

// Helper to transform lean query results - converts _id to id
const transformLeanDoc = <T extends { _id?: any; id?: string }>(
  doc: T
): T & { id: string } => {
  if (!doc) return doc;
  const transformed = { ...doc } as T & { id: string };
  if (doc._id) {
    transformed.id = doc._id.toString();
    delete (transformed as any)._id;
  }
  delete (transformed as any).__v;
  return transformed;
};

const transformLeanDocs = <T extends { _id?: any; id?: string }>(
  docs: T[]
): (T & { id: string })[] => {
  return docs.map(transformLeanDoc);
};

// Get all tasks with filtering, pagination, and caching
export const getTasks = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
      status,
      priority,
      assigneeId,
      creatorId,
      contextType,
      dueDate,
      tags,
      search,
    } = req.query as TaskFilterQuery;

    // Create cache key from filters
    const cacheKey = `tasks:${JSON.stringify(req.query)}`;

    // Try to get from cache first
    const cached = await cacheService.getTaskList(cacheKey, async () => {
      const query: any = {};

      // Apply filters
      if (status) query.status = status;
      if (priority) query.priority = priority;
      if (assigneeId) query.assigneeId = assigneeId;
      if (creatorId) query.creatorId = creatorId;
      if (contextType) query.contextType = contextType;
      if (tags && Array.isArray(tags)) query.tags = { $in: tags };

      // Due date filters
      const now = Date.now();
      if (dueDate === "overdue") {
        query.dueDate = { $lt: now };
        query.status = { $ne: "done" };
      } else if (dueDate === "today") {
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        query.dueDate = { $gte: now, $lte: endOfDay.getTime() };
      } else if (dueDate === "this-week") {
        const endOfWeek = new Date();
        endOfWeek.setDate(endOfWeek.getDate() + 7);
        query.dueDate = { $gte: now, $lte: endOfWeek.getTime() };
      } else if (dueDate === "no-due-date") {
        query.dueDate = null;
      }

      // Text search
      if (search) {
        query.$text = { $search: search };
      }

      const skip = (Number(page) - 1) * Number(limit);
      const sort: any = { [sortBy as string]: sortOrder === "asc" ? 1 : -1 };

      const [tasks, total] = await Promise.all([
        Task.find(query).sort(sort).skip(skip).limit(Number(limit)).lean(),
        Task.countDocuments(query),
      ]);

      return {
        tasks: transformLeanDocs(tasks),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      };
    });

    res.json({
      success: true,
      data: cached.tasks,
      pagination: cached.pagination,
    } as ApiResponse);
  }
);

// Get single task with caching
export const getTask = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const taskId = req.params.id;

    const task = await cacheService.getTask(taskId, async () => {
      const found = await Task.findById(taskId).lean();
      if (!found) {
        throw new AppError("Task not found", 404);
      }
      return transformLeanDoc(found);
    });

    res.json({
      success: true,
      data: task,
    } as ApiResponse);
  }
);

// Get current user's tasks
export const getMyTasks = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId;
    const { status, priority, page = 1, limit = 50 } = req.query;

    const query: any = { assigneeId: userId };
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const skip = (Number(page) - 1) * Number(limit);

    const [tasks, total] = await Promise.all([
      Task.find(query)
        .sort({ priority: -1, dueDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Task.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: transformLeanDocs(tasks),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    } as ApiResponse);
  }
);

// Create task with WebSocket broadcast and notifications
export const createTask = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((e) => ({ field: e.type, message: e.msg })),
      } as ApiResponse);
    }

    const taskData = {
      ...req.body,
      creatorId: req.user?.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const task = await Task.create(taskData);
    const taskObj = task.toJSON();

    // Create activity log
    await Activity.create({
      userId: req.user?.userId,
      type: "task-created",
      timestamp: Date.now(),
      contextType: task.contextType,
      contextId: task._id.toString(),
      content: `Created task: ${task.title}`,
      metadata: { taskId: task._id.toString(), title: task.title },
    });

    // Invalidate task list caches
    await cacheService.invalidateByTag("task-lists");

    // Broadcast via WebSocket
    await wsService.notifyTaskUpdate(
      task._id.toString(),
      "created",
      taskObj,
      req.user?.userId!
    );

    // If assigned, send notification
    if (task.assigneeId && task.assigneeId !== req.user?.userId) {
      await wsService.notifyAssignment(
        task._id.toString(),
        task.assigneeId,
        taskObj,
        req.user?.userId!
      );

      // Queue email notification
      try {
        await jobQueue.sendNotification({
          userId: task.assigneeId,
          title: "New Task Assigned",
          message: `You have been assigned to "${task.title}"`,
          type: "info",
          action: { label: "View Task", url: `/tasks/${task._id}` },
        });
      } catch (error) {
        logger.warn("Failed to queue task notification", error);
      }
    }

    logger.info(`Task created: ${task.title} by ${req.user?.email}`);

    res.status(201).json({
      success: true,
      data: taskObj,
      message: "Task created successfully",
    } as ApiResponse);
  }
);

// Update task with optimistic locking and broadcasting
export const updateTask = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((e) => ({ field: e.type, message: e.msg })),
      } as ApiResponse);
    }

    const taskId = req.params.id;
    const task = await Task.findById(taskId);
    if (!task) {
      throw new AppError("Task not found", 404);
    }

    const oldStatus = task.status;
    const oldAssignee = task.assigneeId;
    const updateData = { ...req.body, updatedAt: Date.now() };

    const updatedTask = await Task.findByIdAndUpdate(taskId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedTask) {
      throw new AppError("Task not found", 404);
    }

    const taskObj = updatedTask.toJSON();

    // Create activity for status change
    if (req.body.status && req.body.status !== oldStatus) {
      await Activity.create({
        userId: req.user?.userId,
        type: req.body.status === "done" ? "task-completed" : "status-changed",
        timestamp: Date.now(),
        contextType: task.contextType,
        contextId: task._id.toString(),
        content: `Changed status from ${oldStatus} to ${req.body.status}`,
        metadata: {
          taskId: task._id.toString(),
          oldStatus,
          newStatus: req.body.status,
        },
      });
    }

    // Create activity and notify for assignment change
    if (req.body.assigneeId && req.body.assigneeId !== oldAssignee) {
      await Activity.create({
        userId: req.user?.userId,
        type: "task-assigned",
        timestamp: Date.now(),
        contextType: task.contextType,
        contextId: task._id.toString(),
        content: `Task assigned to ${req.body.assigneeId}`,
        metadata: {
          taskId: task._id.toString(),
          assigneeId: req.body.assigneeId,
        },
      });

      // Notify new assignee
      if (req.body.assigneeId !== req.user?.userId) {
        await wsService.notifyAssignment(
          taskId,
          req.body.assigneeId,
          taskObj,
          req.user?.userId!
        );
      }
    }

    // Invalidate caches
    await cacheService.invalidateTask(taskId);

    // Broadcast update
    await wsService.notifyTaskUpdate(
      taskId,
      "updated",
      taskObj,
      req.user?.userId!
    );

    logger.info(`Task updated: ${task.title} by ${req.user?.email}`);

    res.json({
      success: true,
      data: taskObj,
      message: "Task updated successfully",
    } as ApiResponse);
  }
);

// Delete task
export const deleteTask = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const taskId = req.params.id;
    const task = await Task.findById(taskId);

    if (!task) {
      throw new AppError("Task not found", 404);
    }

    await Task.findByIdAndDelete(taskId);

    // Invalidate caches
    await cacheService.invalidateTask(taskId);

    // Broadcast deletion
    await wsService.broadcastToRoom(`task:${taskId}`, "task:deleted", {
      taskId,
      deletedBy: req.user?.userId,
    });

    logger.info(`Task deleted: ${task.title} by ${req.user?.email}`);

    res.json({
      success: true,
      message: "Task deleted successfully",
    } as ApiResponse);
  }
);

// Update task status with WebSocket broadcast
export const updateTaskStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { status } = req.body;
    const taskId = req.params.id;

    if (!["todo", "in-progress", "review", "done"].includes(status)) {
      throw new AppError("Invalid status", 400);
    }

    const task = await Task.findById(taskId);
    if (!task) {
      throw new AppError("Task not found", 404);
    }

    const oldStatus = task.status;
    task.status = status;
    task.updatedAt = Date.now();
    await task.save();

    const taskObj = task.toJSON();

    await Activity.create({
      userId: req.user?.userId,
      type: status === "done" ? "task-completed" : "status-changed",
      timestamp: Date.now(),
      contextType: task.contextType,
      contextId: task._id.toString(),
      content: `Changed status from ${oldStatus} to ${status}`,
      metadata: { taskId: task._id.toString(), oldStatus, newStatus: status },
    });

    // Invalidate caches
    await cacheService.invalidateTask(taskId);

    // Broadcast status change
    await wsService.notifyTaskUpdate(
      taskId,
      "updated",
      taskObj,
      req.user?.userId!
    );

    res.json({
      success: true,
      data: taskObj,
      message: "Status updated",
    } as ApiResponse);
  }
);

// Update task dependencies
export const updateTaskDependencies = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { dependencies } = req.body;
    const taskId = req.params.id;

    if (!Array.isArray(dependencies)) {
      throw new AppError("Dependencies must be an array", 400);
    }

    // Validate dependencies exist and check for circular dependencies
    const validDeps: string[] = [];
    for (const depId of dependencies) {
      if (depId === taskId) {
        throw new AppError("Task cannot depend on itself", 400);
      }
      const depTask = await Task.findById(depId);
      if (!depTask) {
        throw new AppError(`Dependency task ${depId} not found`, 404);
      }
      // Check for circular dependency
      if (depTask.dependencies?.includes(taskId)) {
        throw new AppError(
          `Circular dependency detected with task ${depId}`,
          400
        );
      }
      validDeps.push(depId);
    }

    const task = await Task.findByIdAndUpdate(
      taskId,
      { dependencies: validDeps, updatedAt: Date.now() },
      { new: true }
    );

    if (!task) {
      throw new AppError("Task not found", 404);
    }

    // Invalidate cache
    await cacheService.invalidateTask(taskId);

    res.json({
      success: true,
      data: task.toJSON(),
      message: "Dependencies updated",
    } as ApiResponse);
  }
);

// Bulk update tasks with transaction support
export const bulkUpdateTasks = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      throw new AppError("Updates array is required", 400);
    }

    if (updates.length > 100) {
      throw new AppError("Maximum 100 tasks can be updated at once", 400);
    }

    // Use MongoDB transaction for atomic updates
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const results: any[] = [];
      const taskIds: string[] = [];

      for (const update of updates) {
        const { id, data } = update;
        if (!id || !data) continue;

        const updatedTask = await Task.findByIdAndUpdate(
          id,
          { ...data, updatedAt: Date.now() },
          { new: true, session }
        );

        if (updatedTask) {
          results.push(updatedTask.toJSON());
          taskIds.push(id);
        }
      }

      await session.commitTransaction();

      // Invalidate caches for all updated tasks
      await Promise.all(taskIds.map((id) => cacheService.invalidateTask(id)));

      // Broadcast bulk update
      await wsService.broadcastToAll("tasks:bulk-updated", {
        taskIds,
        updatedBy: req.user?.userId,
      });

      logger.info(`Bulk update: ${results.length} tasks by ${req.user?.email}`);

      res.json({
        success: true,
        data: results,
        message: `${results.length} tasks updated`,
      } as ApiResponse);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
);

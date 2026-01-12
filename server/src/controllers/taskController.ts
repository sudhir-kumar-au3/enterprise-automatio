import { Response } from "express";
import { validationResult } from "express-validator";
import { Task, Activity } from "../models";
import { AuthenticatedRequest, ApiResponse, TaskFilterQuery } from "../types";
import { asyncHandler, AppError } from "../middleware";
import logger from "../utils/logger";

// Get all tasks with filtering and pagination
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
      Task.find(query).sort(sort).skip(skip).limit(Number(limit)),
      Task.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: tasks,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    } as ApiResponse);
  }
);

// Get single task
export const getTask = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const task = await Task.findById(req.params.id);

    if (!task) {
      throw new AppError("Task not found", 404);
    }

    res.json({
      success: true,
      data: task,
    } as ApiResponse);
  }
);

// Create task
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

    logger.info(`Task created: ${task.title} by ${req.user?.email}`);

    res.status(201).json({
      success: true,
      data: task,
      message: "Task created successfully",
    } as ApiResponse);
  }
);

// Update task
export const updateTask = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((e) => ({ field: e.type, message: e.msg })),
      } as ApiResponse);
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      throw new AppError("Task not found", 404);
    }

    const oldStatus = task.status;
    const updateData = { ...req.body, updatedAt: Date.now() };

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

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

    // Create activity for assignment change
    if (req.body.assigneeId && req.body.assigneeId !== task.assigneeId) {
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
    }

    logger.info(`Task updated: ${task.title} by ${req.user?.email}`);

    res.json({
      success: true,
      data: updatedTask,
      message: "Task updated successfully",
    } as ApiResponse);
  }
);

// Delete task
export const deleteTask = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const task = await Task.findById(req.params.id);

    if (!task) {
      throw new AppError("Task not found", 404);
    }

    await Task.findByIdAndDelete(req.params.id);

    logger.info(`Task deleted: ${task.title} by ${req.user?.email}`);

    res.json({
      success: true,
      message: "Task deleted successfully",
    } as ApiResponse);
  }
);

// Update task status
export const updateTaskStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { status } = req.body;

    if (!["todo", "in-progress", "review", "done"].includes(status)) {
      throw new AppError("Invalid status", 400);
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      throw new AppError("Task not found", 404);
    }

    const oldStatus = task.status;
    task.status = status;
    task.updatedAt = Date.now();
    await task.save();

    await Activity.create({
      userId: req.user?.userId,
      type: status === "done" ? "task-completed" : "status-changed",
      timestamp: Date.now(),
      contextType: task.contextType,
      contextId: task._id.toString(),
      content: `Changed status from ${oldStatus} to ${status}`,
      metadata: { taskId: task._id.toString(), oldStatus, newStatus: status },
    });

    res.json({
      success: true,
      data: task,
      message: "Status updated",
    } as ApiResponse);
  }
);

// Update task dependencies
export const updateTaskDependencies = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { dependencies } = req.body;

    if (!Array.isArray(dependencies)) {
      throw new AppError("Dependencies must be an array", 400);
    }

    // Validate dependencies exist and check for circular dependencies
    for (const depId of dependencies) {
      const depTask = await Task.findById(depId);
      if (!depTask) {
        throw new AppError(`Dependency task ${depId} not found`, 404);
      }
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { dependencies, updatedAt: Date.now() },
      { new: true }
    );

    if (!task) {
      throw new AppError("Task not found", 404);
    }

    res.json({
      success: true,
      data: task,
      message: "Dependencies updated",
    } as ApiResponse);
  }
);

// Bulk update tasks
export const bulkUpdateTasks = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { taskIds, updates } = req.body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      throw new AppError("Task IDs array is required", 400);
    }

    const result = await Task.updateMany(
      { _id: { $in: taskIds } },
      { ...updates, updatedAt: Date.now() }
    );

    res.json({
      success: true,
      data: { modifiedCount: result.modifiedCount },
      message: `${result.modifiedCount} tasks updated`,
    } as ApiResponse);
  }
);

import { Response } from "express";
import { Task, Comment, TeamMember, Activity, Backup } from "../models";
import {
  AuthenticatedRequest,
  ApiResponse,
  DataStatistics,
  WorkloadStats,
} from "../types";
import { asyncHandler, AppError } from "../middleware";
import logger from "../utils/logger";

// Get dashboard statistics
export const getStatistics = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const sevenDaysMs = 7 * oneDayMs;

    const [tasks, comments, teamMembers] = await Promise.all([
      Task.find(),
      Comment.find(),
      TeamMember.find(),
    ]);

    const statistics: DataStatistics = {
      tasks: {
        total: tasks.length,
        byStatus: {
          todo: tasks.filter((t) => t.status === "todo").length,
          "in-progress": tasks.filter((t) => t.status === "in-progress").length,
          review: tasks.filter((t) => t.status === "review").length,
          done: tasks.filter((t) => t.status === "done").length,
        },
        byPriority: {
          low: tasks.filter((t) => t.priority === "low").length,
          medium: tasks.filter((t) => t.priority === "medium").length,
          high: tasks.filter((t) => t.priority === "high").length,
          critical: tasks.filter((t) => t.priority === "critical").length,
        },
        overdue: tasks.filter(
          (t) => t.dueDate && t.dueDate < now && t.status !== "done"
        ).length,
        dueSoon: tasks.filter(
          (t) =>
            t.dueDate &&
            t.dueDate > now &&
            t.dueDate < now + sevenDaysMs &&
            t.status !== "done"
        ).length,
        withDependencies: tasks.filter(
          (t) => t.dependencies && t.dependencies.length > 0
        ).length,
        unassigned: tasks.filter((t) => !t.assigneeId).length,
      },
      comments: {
        total: comments.length,
        resolved: comments.filter((c) => c.isResolved).length,
        unresolved: comments.filter((c) => !c.isResolved).length,
        byContext: {
          service: comments.filter((c) => c.contextType === "service").length,
          workflow: comments.filter((c) => c.contextType === "workflow").length,
          roadmap: comments.filter((c) => c.contextType === "roadmap").length,
          general: comments.filter((c) => c.contextType === "general").length,
        },
      },
      teamMembers: {
        total: teamMembers.length,
        online: teamMembers.filter((m) => m.isOnline).length,
        offline: teamMembers.filter((m) => !m.isOnline).length,
        byRole: {
          architect: teamMembers.filter((m) => m.role === "architect").length,
          developer: teamMembers.filter((m) => m.role === "developer").length,
          devops: teamMembers.filter((m) => m.role === "devops").length,
          product: teamMembers.filter((m) => m.role === "product").length,
        },
        byAccessLevel: {
          owner: teamMembers.filter((m) => m.accessLevel === "owner").length,
          admin: teamMembers.filter((m) => m.accessLevel === "admin").length,
          member: teamMembers.filter((m) => m.accessLevel === "member").length,
          viewer: teamMembers.filter((m) => m.accessLevel === "viewer").length,
        },
      },
    };

    res.json({
      success: true,
      data: statistics,
    } as ApiResponse);
  }
);

// Get workload statistics per team member
export const getWorkloadStats = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const now = Date.now();
    const [tasks, teamMembers] = await Promise.all([
      Task.find({ status: { $ne: "done" } }),
      TeamMember.find(),
    ]);

    const workloadStats: WorkloadStats[] = teamMembers.map((member) => {
      const memberTasks = tasks.filter(
        (t) => t.assigneeId === member._id.toString()
      );
      const activeTasks = memberTasks.filter((t) => t.status !== "done").length;
      const criticalTasks = memberTasks.filter(
        (t) => t.priority === "critical"
      ).length;
      const highPriorityTasks = memberTasks.filter(
        (t) => t.priority === "high"
      ).length;
      const overdueTasks = memberTasks.filter(
        (t) => t.dueDate && t.dueDate < now
      ).length;

      // Calculate workload score (weighted)
      const workloadScore =
        activeTasks +
        criticalTasks * 3 +
        highPriorityTasks * 2 +
        overdueTasks * 2;

      let workloadLevel: "low" | "balanced" | "high" | "overloaded";
      if (workloadScore <= 3) workloadLevel = "low";
      else if (workloadScore <= 7) workloadLevel = "balanced";
      else if (workloadScore <= 12) workloadLevel = "high";
      else workloadLevel = "overloaded";

      return {
        memberId: member._id.toString(),
        memberName: member.name,
        role: member.role,
        activeTasks,
        totalTasks: memberTasks.length,
        criticalTasks,
        highPriorityTasks,
        overdueTasks,
        workloadScore,
        workloadLevel,
      };
    });

    // Sort by workload score descending
    workloadStats.sort((a, b) => b.workloadScore - a.workloadScore);

    res.json({
      success: true,
      data: workloadStats,
    } as ApiResponse);
  }
);

// Get activity timeline
export const getActivityTimeline = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { limit = 50, userId, type } = req.query;

    const query: any = {};
    if (userId) query.userId = userId;
    if (type) query.type = type;

    const activities = await Activity.find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit));

    res.json({
      success: true,
      data: activities,
    } as ApiResponse);
  }
);

// Export all data
export const exportData = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const [tasks, comments, teamMembers] = await Promise.all([
      Task.find(),
      Comment.find(),
      TeamMember.find(),
    ]);

    const exportData = {
      version: "1.0.0",
      exportDate: Date.now(),
      tasks: tasks.map((t) => t.toJSON()),
      comments: comments.map((c) => c.toJSON()),
      teamMembers: teamMembers.map((m) => {
        const json = m.toJSON();
        delete (json as any).password;
        return json;
      }),
      settings: {},
    };

    logger.info(`Data exported by ${req.user?.email}`);

    res.json({
      success: true,
      data: exportData,
    } as ApiResponse);
  }
);

// Import data
export const importData = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { tasks, comments, teamMembers, clearExisting } = req.body;

    if (clearExisting) {
      await Promise.all([Task.deleteMany({}), Comment.deleteMany({})]);
    }

    const results = {
      tasks: { imported: 0, errors: 0 },
      comments: { imported: 0, errors: 0 },
    };

    // Import tasks
    if (tasks && Array.isArray(tasks)) {
      for (const task of tasks) {
        try {
          const { id, _id, ...taskData } = task;
          await Task.create({
            ...taskData,
            creatorId: taskData.creatorId || req.user?.userId,
          });
          results.tasks.imported++;
        } catch (error) {
          results.tasks.errors++;
        }
      }
    }

    // Import comments
    if (comments && Array.isArray(comments)) {
      for (const comment of comments) {
        try {
          const { id, _id, replies, ...commentData } = comment;
          await Comment.create({
            ...commentData,
            authorId: commentData.authorId || req.user?.userId,
            replies: [],
          });
          results.comments.imported++;
        } catch (error) {
          results.comments.errors++;
        }
      }
    }

    logger.info(
      `Data imported by ${req.user?.email}: ${JSON.stringify(results)}`
    );

    res.json({
      success: true,
      data: results,
      message: "Data imported successfully",
    } as ApiResponse);
  }
);

// Create backup
export const createBackup = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { type = "manual" } = req.body;

    const [tasks, comments, teamMembers] = await Promise.all([
      Task.find(),
      Comment.find(),
      TeamMember.find(),
    ]);

    const backupData = {
      version: "1.0.0",
      exportDate: Date.now(),
      tasks: tasks.map((t) => t.toJSON()),
      comments: comments.map((c) => c.toJSON()),
      teamMembers: teamMembers.map((m) => {
        const json = m.toJSON();
        delete (json as any).password;
        return json;
      }),
    };

    const backup = await Backup.create({
      timestamp: Date.now(),
      data: JSON.stringify(backupData),
      userId: req.user?.userId,
      type,
    });

    // Keep only 10 most recent backups per user
    const userBackups = await Backup.find({ userId: req.user?.userId }).sort({
      timestamp: -1,
    });

    if (userBackups.length > 10) {
      const toDelete = userBackups.slice(10);
      await Backup.deleteMany({ _id: { $in: toDelete.map((b) => b._id) } });
    }

    logger.info(`Backup created by ${req.user?.email}`);

    res.status(201).json({
      success: true,
      data: { id: backup._id, timestamp: backup.timestamp, type: backup.type },
      message: "Backup created successfully",
    } as ApiResponse);
  }
);

// Get backups list
export const getBackups = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const backups = await Backup.find({ userId: req.user?.userId })
      .sort({ timestamp: -1 })
      .select("-data");

    res.json({
      success: true,
      data: backups,
    } as ApiResponse);
  }
);

// Restore from backup
export const restoreBackup = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const backup = await Backup.findById(req.params.id);

    if (!backup) {
      throw new AppError("Backup not found", 404);
    }

    if (backup.userId !== req.user?.userId) {
      throw new AppError("Not authorized to restore this backup", 403);
    }

    const data = JSON.parse(backup.data);

    // Clear existing data and restore
    await Promise.all([Task.deleteMany({}), Comment.deleteMany({})]);

    if (data.tasks) {
      await Task.insertMany(
        data.tasks.map((t: any) => {
          const { id, _id, ...rest } = t;
          return rest;
        })
      );
    }

    if (data.comments) {
      await Comment.insertMany(
        data.comments.map((c: any) => {
          const { id, _id, ...rest } = c;
          return { ...rest, replies: [] };
        })
      );
    }

    logger.info(`Backup restored by ${req.user?.email}`);

    res.json({
      success: true,
      message: "Backup restored successfully",
    } as ApiResponse);
  }
);

// Delete backup
export const deleteBackup = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const backup = await Backup.findById(req.params.id);

    if (!backup) {
      throw new AppError("Backup not found", 404);
    }

    if (backup.userId !== req.user?.userId) {
      throw new AppError("Not authorized to delete this backup", 403);
    }

    await Backup.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Backup deleted successfully",
    } as ApiResponse);
  }
);

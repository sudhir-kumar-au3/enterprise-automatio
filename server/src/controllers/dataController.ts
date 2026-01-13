import { Response } from "express";
import { Task, Comment, TeamMember, Activity, Backup } from "../models";
import {
  AuthenticatedRequest,
  ApiResponse,
  DataStatistics,
  WorkloadStats,
} from "../types";
import { asyncHandler, AppError } from "../middleware";
import { cacheService } from "../services/cache.service";
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

// Get dashboard statistics with caching
export const getStatistics = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const statistics = await cacheService.getStatistics(
      "dashboard",
      async () => {
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        const sevenDaysMs = 7 * oneDayMs;

        // Use aggregation pipeline for better performance
        const [taskStats, commentStats, teamStats] = await Promise.all([
          Task.aggregate([
            {
              $facet: {
                total: [{ $count: "count" }],
                byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
                byPriority: [
                  { $group: { _id: "$priority", count: { $sum: 1 } } },
                ],
                overdue: [
                  {
                    $match: { dueDate: { $lt: now }, status: { $ne: "done" } },
                  },
                  { $count: "count" },
                ],
                dueSoon: [
                  {
                    $match: {
                      dueDate: { $gte: now, $lt: now + sevenDaysMs },
                      status: { $ne: "done" },
                    },
                  },
                  { $count: "count" },
                ],
                withDependencies: [
                  { $match: { dependencies: { $exists: true, $ne: [] } } },
                  { $count: "count" },
                ],
                unassigned: [
                  { $match: { assigneeId: null } },
                  { $count: "count" },
                ],
                completedThisWeek: [
                  {
                    $match: {
                      status: "done",
                      updatedAt: { $gte: now - sevenDaysMs },
                    },
                  },
                  { $count: "count" },
                ],
              },
            },
          ]),
          Comment.aggregate([
            {
              $facet: {
                total: [{ $count: "count" }],
                resolved: [
                  { $match: { isResolved: true } },
                  { $count: "count" },
                ],
                byContext: [
                  { $group: { _id: "$contextType", count: { $sum: 1 } } },
                ],
              },
            },
          ]),
          TeamMember.aggregate([
            {
              $facet: {
                total: [{ $count: "count" }],
                online: [{ $match: { isOnline: true } }, { $count: "count" }],
                byRole: [{ $group: { _id: "$role", count: { $sum: 1 } } }],
                byAccessLevel: [
                  { $group: { _id: "$accessLevel", count: { $sum: 1 } } },
                ],
              },
            },
          ]),
        ]);

        // Transform aggregation results
        const taskData = taskStats[0];
        const commentData = commentStats[0];
        const teamData = teamStats[0];

        // Helper to convert aggregation array to object with defaults
        const toRecord = <T extends string>(
          arr: any[],
          defaults: T[]
        ): Record<T, number> => {
          const result = {} as Record<T, number>;
          defaults.forEach((key) => {
            result[key] = 0;
          });
          arr.forEach((item: any) => {
            if (item._id && defaults.includes(item._id)) {
              result[item._id as T] = item.count;
            }
          });
          return result;
        };

        const statistics: DataStatistics = {
          tasks: {
            total: taskData.total[0]?.count || 0,
            byStatus: toRecord(taskData.byStatus, [
              "todo",
              "in-progress",
              "review",
              "done",
            ]),
            byPriority: toRecord(taskData.byPriority, [
              "low",
              "medium",
              "high",
              "critical",
            ]),
            overdue: taskData.overdue[0]?.count || 0,
            dueSoon: taskData.dueSoon[0]?.count || 0,
            withDependencies: taskData.withDependencies[0]?.count || 0,
            unassigned: taskData.unassigned[0]?.count || 0,
            completedThisWeek: taskData.completedThisWeek[0]?.count || 0,
          },
          comments: {
            total: commentData.total[0]?.count || 0,
            resolved: commentData.resolved[0]?.count || 0,
            unresolved:
              (commentData.total[0]?.count || 0) -
              (commentData.resolved[0]?.count || 0),
            byContext: toRecord(commentData.byContext, [
              "service",
              "workflow",
              "roadmap",
              "general",
            ]),
          },
          teamMembers: {
            total: teamData.total[0]?.count || 0,
            online: teamData.online[0]?.count || 0,
            offline:
              (teamData.total[0]?.count || 0) -
              (teamData.online[0]?.count || 0),
            byRole: toRecord(teamData.byRole, [
              "architect",
              "developer",
              "devops",
              "product",
            ]),
            byAccessLevel: toRecord(teamData.byAccessLevel, [
              "owner",
              "admin",
              "member",
              "viewer",
            ]),
          },
        };

        return statistics;
      }
    );

    res.json({
      success: true,
      data: statistics,
    } as ApiResponse);
  }
);

// Get workload statistics per team member with caching
export const getWorkloadStats = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const workloadStats = await cacheService.getOrSet(
      "workload:stats",
      async () => {
        const now = Date.now();

        // Use aggregation for better performance
        const workload = await Task.aggregate([
          { $match: { status: { $ne: "done" } } },
          {
            $group: {
              _id: "$assigneeId",
              activeTasks: { $sum: 1 },
              criticalTasks: {
                $sum: { $cond: [{ $eq: ["$priority", "critical"] }, 1, 0] },
              },
              highPriorityTasks: {
                $sum: { $cond: [{ $eq: ["$priority", "high"] }, 1, 0] },
              },
              overdueTasks: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$dueDate", null] },
                        { $lt: ["$dueDate", now] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ]);

        const teamMembers = await TeamMember.find().lean();

        const workloadStats: WorkloadStats[] = teamMembers.map((member) => {
          const memberWorkload = workload.find(
            (w) => w._id === member._id.toString()
          ) || {
            activeTasks: 0,
            criticalTasks: 0,
            highPriorityTasks: 0,
            overdueTasks: 0,
          };

          const workloadScore =
            memberWorkload.activeTasks +
            memberWorkload.criticalTasks * 3 +
            memberWorkload.highPriorityTasks * 2 +
            memberWorkload.overdueTasks * 2;

          let workloadLevel: "low" | "balanced" | "high" | "overloaded";
          if (workloadScore <= 3) workloadLevel = "low";
          else if (workloadScore <= 7) workloadLevel = "balanced";
          else if (workloadScore <= 12) workloadLevel = "high";
          else workloadLevel = "overloaded";

          return {
            memberId: member._id.toString(),
            memberName: member.name,
            role: member.role,
            activeTasks: memberWorkload.activeTasks,
            totalTasks: memberWorkload.activeTasks,
            criticalTasks: memberWorkload.criticalTasks,
            highPriorityTasks: memberWorkload.highPriorityTasks,
            overdueTasks: memberWorkload.overdueTasks,
            workloadScore,
            workloadLevel,
          };
        });

        return workloadStats.sort((a, b) => b.workloadScore - a.workloadScore);
      },
      { ttl: 60, tags: ["statistics", "workload"] }
    );

    res.json({
      success: true,
      data: workloadStats,
    } as ApiResponse);
  }
);

// Get activity timeline with caching
export const getActivityTimeline = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { page = 1, limit = 50, userId, type } = req.query;

    const cacheKey = `activity:${JSON.stringify(req.query)}`;

    const result = await cacheService.getOrSet(
      cacheKey,
      async () => {
        const query: any = {};
        if (userId) query.userId = userId;
        if (type) query.type = type;

        const skip = (Number(page) - 1) * Number(limit);

        const [activities, total] = await Promise.all([
          Activity.find(query)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean(),
          Activity.countDocuments(query),
        ]);

        return {
          activities,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit)),
          },
        };
      },
      { ttl: 30, tags: ["activities"] }
    );

    res.json({
      success: true,
      data: result.activities,
      pagination: result.pagination,
    } as ApiResponse);
  }
);

// Export all data
export const exportData = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const [tasks, comments, teamMembers] = await Promise.all([
      Task.find().lean(),
      Comment.find().lean(),
      TeamMember.find().lean(),
    ]);

    const exportData = {
      version: "1.0.0",
      exportDate: Date.now(),
      tasks: transformLeanDocs(tasks),
      comments: transformLeanDocs(comments),
      teamMembers: transformLeanDocs(teamMembers).map((m) => {
        const { password, ...rest } = m as any;
        return rest;
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

    // Invalidate all caches after import
    await cacheService.invalidateByTag("tasks");
    await cacheService.invalidateByTag("comments");
    await cacheService.invalidateByTag("statistics");

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
      Task.find().lean(),
      Comment.find().lean(),
      TeamMember.find().lean(),
    ]);

    const backupData = {
      version: "1.0.0",
      exportDate: Date.now(),
      tasks: transformLeanDocs(tasks),
      comments: transformLeanDocs(comments),
      teamMembers: transformLeanDocs(teamMembers).map((m) => {
        const { password, ...rest } = m as any;
        return rest;
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
      .select("-data")
      .lean();

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

    // Invalidate all caches after restore
    await cacheService.invalidateByTag("tasks");
    await cacheService.invalidateByTag("comments");
    await cacheService.invalidateByTag("statistics");

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

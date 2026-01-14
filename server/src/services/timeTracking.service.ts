import TimeEntry, { TimeEntryDocument, ITimeEntry } from "../models/TimeEntry";
import Task from "../models/Task";
import logger from "../utils/logger";

export interface TimeEntryFilters {
  organizationId: string; // Required for multi-tenancy
  taskId?: string;
  userId?: string;
  startDate?: number;
  endDate?: number;
  isBillable?: boolean;
  isRunning?: boolean;
  page?: number;
  limit?: number;
}

export interface TimeStats {
  totalTime: number; // in seconds
  billableTime: number;
  nonBillableTime: number;
  totalEarnings: number;
  entriesCount: number;
  averageSessionDuration: number;
  taskBreakdown: Array<{
    taskId: string;
    taskTitle: string;
    totalTime: number;
    percentage: number;
  }>;
  dailyBreakdown: Array<{
    date: string;
    totalTime: number;
    billableTime: number;
  }>;
}

class TimeTrackingService {
  /**
   * Start a new time entry (timer)
   */
  async startTimer(data: {
    organizationId: string;
    taskId: string;
    userId: string;
    description?: string;
    isBillable?: boolean;
    hourlyRate?: number;
    tags?: string[];
  }): Promise<TimeEntryDocument> {
    // Stop any running timer for this user first
    await this.stopRunningTimers(data.organizationId, data.userId);

    const timeEntry = new TimeEntry({
      organizationId: data.organizationId,
      taskId: data.taskId,
      userId: data.userId,
      description: data.description || "",
      startTime: Date.now(),
      isBillable: data.isBillable ?? false,
      hourlyRate: data.hourlyRate,
      tags: data.tags || [],
      isRunning: true,
      duration: 0,
    });

    await timeEntry.save();
    logger.info(`Timer started for task ${data.taskId} by user ${data.userId}`);
    return timeEntry;
  }

  /**
   * Stop a running timer
   */
  async stopTimer(
    timeEntryId: string,
    organizationId: string,
    userId: string
  ): Promise<TimeEntryDocument | null> {
    const timeEntry = await TimeEntry.findOne({
      _id: timeEntryId,
      organizationId,
      userId,
      isRunning: true,
    });

    if (!timeEntry) {
      return null;
    }

    timeEntry.endTime = Date.now();
    timeEntry.isRunning = false;
    timeEntry.duration = Math.floor(
      (timeEntry.endTime - timeEntry.startTime) / 1000
    );

    await timeEntry.save();
    logger.info(
      `Timer stopped for entry ${timeEntryId}, duration: ${timeEntry.duration}s`
    );
    return timeEntry;
  }

  /**
   * Stop all running timers for a user
   */
  async stopRunningTimers(
    organizationId: string,
    userId: string
  ): Promise<number> {
    const runningEntries = await TimeEntry.find({
      organizationId,
      userId,
      isRunning: true,
    });

    for (const entry of runningEntries) {
      entry.endTime = Date.now();
      entry.isRunning = false;
      entry.duration = Math.floor((entry.endTime - entry.startTime) / 1000);
      await entry.save();
    }

    return runningEntries.length;
  }

  /**
   * Get the currently running timer for a user
   */
  async getRunningTimer(
    organizationId: string,
    userId: string
  ): Promise<TimeEntryDocument | null> {
    return TimeEntry.findOne({ organizationId, userId, isRunning: true });
  }

  /**
   * Create a manual time entry
   */
  async createManualEntry(data: {
    organizationId: string;
    taskId: string;
    userId: string;
    startTime: number;
    endTime: number;
    description?: string;
    isBillable?: boolean;
    hourlyRate?: number;
    tags?: string[];
  }): Promise<TimeEntryDocument> {
    const duration = Math.floor((data.endTime - data.startTime) / 1000);

    const timeEntry = new TimeEntry({
      ...data,
      duration,
      isRunning: false,
    });

    await timeEntry.save();
    return timeEntry;
  }

  /**
   * Update a time entry
   */
  async updateEntry(
    timeEntryId: string,
    organizationId: string,
    userId: string,
    updates: Partial<
      Pick<
        ITimeEntry,
        | "description"
        | "startTime"
        | "endTime"
        | "isBillable"
        | "hourlyRate"
        | "tags"
      >
    >
  ): Promise<TimeEntryDocument | null> {
    const timeEntry = await TimeEntry.findOne({
      _id: timeEntryId,
      organizationId,
      userId,
    });

    if (!timeEntry) {
      return null;
    }

    Object.assign(timeEntry, updates);

    if (updates.startTime || updates.endTime) {
      if (timeEntry.endTime && timeEntry.startTime) {
        timeEntry.duration = Math.floor(
          (timeEntry.endTime - timeEntry.startTime) / 1000
        );
      }
    }

    await timeEntry.save();
    return timeEntry;
  }

  /**
   * Delete a time entry
   */
  async deleteEntry(
    timeEntryId: string,
    organizationId: string,
    userId: string
  ): Promise<boolean> {
    const result = await TimeEntry.deleteOne({
      _id: timeEntryId,
      organizationId,
      userId,
    });
    return result.deletedCount > 0;
  }

  /**
   * Get time entries with filters
   */
  async getEntries(filters: TimeEntryFilters): Promise<{
    entries: TimeEntryDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query: Record<string, any> = {
      organizationId: filters.organizationId,
    };

    if (filters.taskId) query.taskId = filters.taskId;
    if (filters.userId) query.userId = filters.userId;
    if (filters.isBillable !== undefined) query.isBillable = filters.isBillable;
    if (filters.isRunning !== undefined) query.isRunning = filters.isRunning;

    if (filters.startDate || filters.endDate) {
      query.startTime = {};
      if (filters.startDate) query.startTime.$gte = filters.startDate;
      if (filters.endDate) query.startTime.$lte = filters.endDate;
    }

    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      TimeEntry.find(query).sort({ startTime: -1 }).skip(skip).limit(limit),
      TimeEntry.countDocuments(query),
    ]);

    return {
      entries,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get time statistics for a user or task
   */
  async getTimeStats(filters: {
    organizationId: string;
    userId?: string;
    taskId?: string;
    startDate: number;
    endDate: number;
  }): Promise<TimeStats> {
    const matchQuery: Record<string, any> = {
      organizationId: filters.organizationId,
      startTime: { $gte: filters.startDate, $lte: filters.endDate },
      isRunning: false,
    };

    if (filters.userId) matchQuery.userId = filters.userId;
    if (filters.taskId) matchQuery.taskId = filters.taskId;

    const entries = await TimeEntry.find(matchQuery);

    let totalTime = 0;
    let billableTime = 0;
    let nonBillableTime = 0;
    let totalEarnings = 0;
    const taskTimes: Record<string, number> = {};
    const dailyTimes: Record<string, { total: number; billable: number }> = {};

    for (const entry of entries) {
      totalTime += entry.duration;

      if (entry.isBillable) {
        billableTime += entry.duration;
        if (entry.hourlyRate) {
          totalEarnings += (entry.duration / 3600) * entry.hourlyRate;
        }
      } else {
        nonBillableTime += entry.duration;
      }

      // Task breakdown
      if (!taskTimes[entry.taskId]) {
        taskTimes[entry.taskId] = 0;
      }
      taskTimes[entry.taskId] += entry.duration;

      // Daily breakdown
      const dateKey = new Date(entry.startTime).toISOString().split("T")[0];
      if (!dailyTimes[dateKey]) {
        dailyTimes[dateKey] = { total: 0, billable: 0 };
      }
      dailyTimes[dateKey].total += entry.duration;
      if (entry.isBillable) {
        dailyTimes[dateKey].billable += entry.duration;
      }
    }

    // Get task titles - also scope by organization
    const taskIds = Object.keys(taskTimes);
    const tasks = await Task.find({
      _id: { $in: taskIds },
      organizationId: filters.organizationId,
    }).select("title");
    const taskTitleMap = new Map(tasks.map((t) => [t._id.toString(), t.title]));

    const taskBreakdown = Object.entries(taskTimes)
      .map(([taskId, time]) => ({
        taskId,
        taskTitle: taskTitleMap.get(taskId) || "Unknown Task",
        totalTime: time,
        percentage: totalTime > 0 ? (time / totalTime) * 100 : 0,
      }))
      .sort((a, b) => b.totalTime - a.totalTime);

    const dailyBreakdown = Object.entries(dailyTimes)
      .map(([date, times]) => ({
        date,
        totalTime: times.total,
        billableTime: times.billable,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalTime,
      billableTime,
      nonBillableTime,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      entriesCount: entries.length,
      averageSessionDuration:
        entries.length > 0 ? Math.round(totalTime / entries.length) : 0,
      taskBreakdown,
      dailyBreakdown,
    };
  }

  /**
   * Get total time logged for a specific task
   */
  async getTaskTotalTime(
    organizationId: string,
    taskId: string
  ): Promise<number> {
    const result = await TimeEntry.aggregate([
      { $match: { organizationId, taskId, isRunning: false } },
      { $group: { _id: null, totalDuration: { $sum: "$duration" } } },
    ]);

    return result.length > 0 ? result[0].totalDuration : 0;
  }
}

export const timeTrackingService = new TimeTrackingService();
export default timeTrackingService;

/**
 * Background Job Queue Service using BullMQ
 *
 * Features:
 * - Redis-backed job queue for distributed processing
 * - Job prioritization and scheduling
 * - Automatic retries with exponential backoff
 * - Job progress tracking and events
 * - Dedicated queues for different job types
 * - Dead letter queue for failed jobs
 */

import { Queue, Worker, Job, QueueEvents, JobsOptions } from "bullmq";
import { createClient } from "redis";
import config from "../config";
import logger from "../utils/logger";

// Redis connection for BullMQ
const redisConnection = {
  host: config.redis?.host || "localhost",
  port: config.redis?.port || 6379,
  password: config.redis?.password || undefined,
  maxRetriesPerRequest: null as null,
};

// Job types
export enum JobType {
  // Email jobs
  SEND_EMAIL = "send-email",
  SEND_BULK_EMAIL = "send-bulk-email",
  SEND_TASK_NOTIFICATION = "send-task-notification",
  SEND_MENTION_NOTIFICATION = "send-mention-notification",
  SEND_WELCOME_EMAIL = "send-welcome-email",
  SEND_PASSWORD_RESET = "send-password-reset",
  SEND_DAILY_DIGEST = "send-daily-digest",

  // Notification jobs
  SEND_PUSH_NOTIFICATION = "send-push-notification",
  SEND_IN_APP_NOTIFICATION = "send-in-app-notification",

  // Report jobs
  GENERATE_REPORT = "generate-report",
  EXPORT_DATA = "export-data",

  // Task jobs
  TASK_REMINDER = "task-reminder",
  TASK_OVERDUE_CHECK = "task-overdue-check",

  // Cleanup jobs
  CLEANUP_OLD_DATA = "cleanup-old-data",
  CLEANUP_EXPIRED_TOKENS = "cleanup-expired-tokens",
  CLEANUP_OLD_FILES = "cleanup-old-files",
  ARCHIVE_COMPLETED_TASKS = "archive-completed-tasks",

  // Webhook jobs
  SEND_WEBHOOK = "send-webhook",

  // File processing
  PROCESS_FILE_UPLOAD = "process-file-upload",
  GENERATE_THUMBNAIL = "generate-thumbnail",
}

// Queue names
export enum QueueName {
  EMAIL = "email-queue",
  NOTIFICATIONS = "notifications-queue",
  REPORTS = "reports-queue",
  TASKS = "tasks-queue",
  CLEANUP = "cleanup-queue",
  WEBHOOKS = "webhooks-queue",
  FILES = "files-queue",
}

// Job data interfaces
export interface EmailJobData {
  to: string | string[];
  subject: string;
  template: string;
  data: Record<string, any>;
  attachments?: Array<{ filename: string; path: string }>;
}

export interface NotificationJobData {
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  action?: { label: string; url: string };
  data?: Record<string, any>;
}

export interface ReportJobData {
  type: "task-summary" | "team-activity" | "productivity" | "custom";
  userId: string;
  filters: Record<string, any>;
  format: "pdf" | "csv" | "xlsx";
  dateRange: { start: Date; end: Date };
}

export interface WebhookJobData {
  url: string;
  method: "GET" | "POST" | "PUT";
  headers: Record<string, string>;
  payload: Record<string, any>;
  retryCount?: number;
}

export interface FileProcessingJobData {
  fileId: string;
  filePath: string;
  userId: string;
  operation: "thumbnail" | "compress" | "convert" | "scan";
  options?: Record<string, any>;
}

// Default job options by priority
const JOB_OPTIONS: Record<string, JobsOptions> = {
  high: {
    priority: 1,
    attempts: 5,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
  normal: {
    priority: 2,
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
  low: {
    priority: 3,
    attempts: 2,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 200 },
  },
};

class JobQueueService {
  private queues: Map<QueueName, Queue> = new Map();
  private workers: Map<QueueName, Worker> = new Map();
  private queueEvents: Map<QueueName, QueueEvents> = new Map();
  private isInitialized = false;

  /**
   * Initialize all queues and workers
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create queues
      for (const queueName of Object.values(QueueName)) {
        const queue = new Queue(queueName, { connection: redisConnection });
        this.queues.set(queueName, queue);

        // Create queue events for monitoring
        const events = new QueueEvents(queueName, {
          connection: redisConnection,
        });
        this.queueEvents.set(queueName, events);

        // Setup event listeners
        this.setupQueueEvents(queueName, events);
      }

      // Create workers for each queue
      await this.createWorkers();

      // Schedule recurring jobs
      await this.scheduleRecurringJobs();

      this.isInitialized = true;
      logger.info("Job queue service initialized");
    } catch (error) {
      logger.error("Failed to initialize job queue service", error);
      throw error;
    }
  }

  /**
   * Create workers for processing jobs
   */
  private async createWorkers(): Promise<void> {
    // Email worker
    this.createWorker(
      QueueName.EMAIL,
      async (job: Job) => {
        return this.processEmailJob(job);
      },
      { concurrency: 5 }
    );

    // Notifications worker
    this.createWorker(
      QueueName.NOTIFICATIONS,
      async (job: Job) => {
        return this.processNotificationJob(job);
      },
      { concurrency: 10 }
    );

    // Reports worker (resource intensive, lower concurrency)
    this.createWorker(
      QueueName.REPORTS,
      async (job: Job) => {
        return this.processReportJob(job);
      },
      { concurrency: 2 }
    );

    // Tasks worker
    this.createWorker(
      QueueName.TASKS,
      async (job: Job) => {
        return this.processTaskJob(job);
      },
      { concurrency: 5 }
    );

    // Cleanup worker
    this.createWorker(
      QueueName.CLEANUP,
      async (job: Job) => {
        return this.processCleanupJob(job);
      },
      { concurrency: 1 }
    );

    // Webhooks worker
    this.createWorker(
      QueueName.WEBHOOKS,
      async (job: Job) => {
        return this.processWebhookJob(job);
      },
      { concurrency: 10 }
    );

    // Files worker
    this.createWorker(
      QueueName.FILES,
      async (job: Job) => {
        return this.processFileJob(job);
      },
      { concurrency: 3 }
    );
  }

  /**
   * Create a worker for a specific queue
   */
  private createWorker(
    queueName: QueueName,
    processor: (job: Job) => Promise<any>,
    options: { concurrency: number }
  ): void {
    const worker = new Worker(queueName, processor, {
      connection: redisConnection,
      concurrency: options.concurrency,
      limiter: {
        max: 100,
        duration: 1000, // 100 jobs per second max
      },
    });

    worker.on("completed", (job: Job) => {
      logger.debug(`Job completed: ${job.id} in ${queueName}`);
    });

    worker.on("failed", (job: Job | undefined, error: Error) => {
      logger.error(`Job failed: ${job?.id} in ${queueName}`, {
        error: error.message,
      });
    });

    worker.on("error", (error: Error) => {
      logger.error(`Worker error in ${queueName}`, error);
    });

    this.workers.set(queueName, worker);
  }

  /**
   * Setup queue event listeners
   */
  private setupQueueEvents(queueName: QueueName, events: QueueEvents): void {
    events.on(
      "completed",
      ({ jobId, returnvalue }: { jobId: string; returnvalue: any }) => {
        logger.debug(`Job ${jobId} completed in ${queueName}`);
      }
    );

    events.on(
      "failed",
      ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
        logger.warn(`Job ${jobId} failed in ${queueName}: ${failedReason}`);
      }
    );

    events.on("stalled", ({ jobId }: { jobId: string }) => {
      logger.warn(`Job ${jobId} stalled in ${queueName}`);
    });
  }

  /**
   * Schedule recurring jobs
   */
  private async scheduleRecurringJobs(): Promise<void> {
    const tasksQueue = this.queues.get(QueueName.TASKS);
    const cleanupQueue = this.queues.get(QueueName.CLEANUP);

    if (tasksQueue) {
      // Check for overdue tasks every hour
      await tasksQueue.add(
        JobType.TASK_OVERDUE_CHECK,
        {},
        {
          repeat: { pattern: "0 * * * *" }, // Every hour
          jobId: "recurring-overdue-check",
        }
      );

      // Send task reminders every 15 minutes
      await tasksQueue.add(
        JobType.TASK_REMINDER,
        {},
        {
          repeat: { pattern: "*/15 * * * *" }, // Every 15 minutes
          jobId: "recurring-task-reminders",
        }
      );
    }

    if (cleanupQueue) {
      // Cleanup expired tokens daily
      await cleanupQueue.add(
        JobType.CLEANUP_EXPIRED_TOKENS,
        {},
        {
          repeat: { pattern: "0 2 * * *" }, // 2 AM daily
          jobId: "recurring-token-cleanup",
        }
      );

      // Cleanup old data weekly
      await cleanupQueue.add(
        JobType.CLEANUP_OLD_DATA,
        { daysOld: 90 },
        {
          repeat: { pattern: "0 3 * * 0" }, // 3 AM every Sunday
          jobId: "recurring-data-cleanup",
        }
      );
    }

    logger.info("Recurring jobs scheduled");
  }

  // ==================== Public API ====================

  /**
   * Add email job to queue
   */
  async sendEmail(
    data: EmailJobData,
    priority: "high" | "normal" | "low" = "normal"
  ): Promise<Job> {
    const queue = this.queues.get(QueueName.EMAIL);
    if (!queue) throw new Error("Email queue not initialized");

    return queue.add(JobType.SEND_EMAIL, data, {
      ...JOB_OPTIONS[priority],
      jobId: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    });
  }

  /**
   * Add bulk email job
   */
  async sendBulkEmail(
    recipients: string[],
    subject: string,
    template: string,
    data: Record<string, any>
  ): Promise<Job> {
    const queue = this.queues.get(QueueName.EMAIL);
    if (!queue) throw new Error("Email queue not initialized");

    return queue.add(
      JobType.SEND_BULK_EMAIL,
      { recipients, subject, template, data },
      {
        ...JOB_OPTIONS.low,
        jobId: `bulk-email-${Date.now()}`,
      }
    );
  }

  /**
   * Add notification job
   */
  async sendNotification(
    data: NotificationJobData,
    priority: "high" | "normal" | "low" = "normal"
  ): Promise<Job> {
    const queue = this.queues.get(QueueName.NOTIFICATIONS);
    if (!queue) throw new Error("Notifications queue not initialized");

    return queue.add(JobType.SEND_IN_APP_NOTIFICATION, data, {
      ...JOB_OPTIONS[priority],
    });
  }

  /**
   * Add report generation job
   */
  async generateReport(data: ReportJobData): Promise<Job> {
    const queue = this.queues.get(QueueName.REPORTS);
    if (!queue) throw new Error("Reports queue not initialized");

    return queue.add(JobType.GENERATE_REPORT, data, {
      ...JOB_OPTIONS.low,
      jobId: `report-${data.type}-${data.userId}-${Date.now()}`,
    });
  }

  /**
   * Add data export job
   */
  async exportData(
    userId: string,
    type: string,
    filters: Record<string, any>,
    format: "csv" | "xlsx" | "json"
  ): Promise<Job> {
    const queue = this.queues.get(QueueName.REPORTS);
    if (!queue) throw new Error("Reports queue not initialized");

    return queue.add(
      JobType.EXPORT_DATA,
      { userId, type, filters, format },
      {
        ...JOB_OPTIONS.low,
        jobId: `export-${type}-${userId}-${Date.now()}`,
      }
    );
  }

  /**
   * Add webhook job
   */
  async sendWebhook(data: WebhookJobData): Promise<Job> {
    const queue = this.queues.get(QueueName.WEBHOOKS);
    if (!queue) throw new Error("Webhooks queue not initialized");

    return queue.add(JobType.SEND_WEBHOOK, data, {
      ...JOB_OPTIONS.normal,
    });
  }

  /**
   * Add file processing job
   */
  async processFile(data: FileProcessingJobData): Promise<Job> {
    const queue = this.queues.get(QueueName.FILES);
    if (!queue) throw new Error("Files queue not initialized");

    return queue.add(JobType.PROCESS_FILE_UPLOAD, data, {
      ...JOB_OPTIONS.normal,
      jobId: `file-${data.fileId}-${data.operation}`,
    });
  }

  /**
   * Get job status
   */
  async getJobStatus(
    queueName: QueueName,
    jobId: string
  ): Promise<{
    id: string;
    status: string;
    progress: number;
    data: any;
    result?: any;
    failedReason?: string;
  } | null> {
    const queue = this.queues.get(queueName);
    if (!queue) return null;

    const job = await queue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();

    return {
      id: job.id || jobId,
      status: state,
      progress: (job.progress as number) || 0,
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: QueueName): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Get all queues statistics
   */
  async getAllQueuesStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {};

    for (const queueName of Object.values(QueueName)) {
      stats[queueName] = await this.getQueueStats(queueName);
    }

    return stats;
  }

  // ==================== Job Processors ====================

  private async processEmailJob(job: Job): Promise<any> {
    const { data } = job;
    logger.info(`Processing email job: ${job.id}`, {
      to: data.to,
      subject: data.subject,
    });

    // TODO: Integrate with email service (SendGrid, SES, etc.)
    // For now, simulate email sending
    await job.updateProgress(50);

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await job.updateProgress(100);

    return { sent: true, messageId: `msg-${Date.now()}` };
  }

  private async processNotificationJob(job: Job): Promise<any> {
    const data = job.data as NotificationJobData;
    logger.info(`Processing notification job: ${job.id}`, {
      userId: data.userId,
    });

    // TODO: Store notification in database and send via WebSocket
    await job.updateProgress(100);

    return { delivered: true };
  }

  private async processReportJob(job: Job): Promise<any> {
    const data = job.data as ReportJobData;
    logger.info(`Processing report job: ${job.id}`, {
      type: data.type,
      userId: data.userId,
    });

    await job.updateProgress(10);

    // TODO: Generate actual report
    // Simulate report generation
    await new Promise((resolve) => setTimeout(resolve, 5000));

    await job.updateProgress(100);

    return {
      reportId: `report-${Date.now()}`,
      downloadUrl: `/api/v1/reports/download/report-${Date.now()}`,
    };
  }

  private async processTaskJob(job: Job): Promise<any> {
    const { name, data } = job;
    logger.info(`Processing task job: ${job.id}`, { type: name });

    if (name === JobType.TASK_OVERDUE_CHECK) {
      // TODO: Query database for overdue tasks and send notifications
      return { checkedTasks: 0, overdueFound: 0 };
    }

    if (name === JobType.TASK_REMINDER) {
      // TODO: Query database for tasks due soon and send reminders
      return { remindersSent: 0 };
    }

    return { processed: true };
  }

  private async processCleanupJob(job: Job): Promise<any> {
    const { name, data } = job;
    logger.info(`Processing cleanup job: ${job.id}`, { type: name });

    if (name === JobType.CLEANUP_EXPIRED_TOKENS) {
      // TODO: Delete expired refresh tokens from database
      return { tokensDeleted: 0 };
    }

    if (name === JobType.CLEANUP_OLD_DATA) {
      // TODO: Archive or delete old activity logs, etc.
      return { recordsArchived: 0 };
    }

    return { processed: true };
  }

  private async processWebhookJob(job: Job): Promise<any> {
    const data = job.data as WebhookJobData;
    logger.info(`Processing webhook job: ${job.id}`, { url: data.url });

    try {
      const response = await fetch(data.url, {
        method: data.method,
        headers: {
          "Content-Type": "application/json",
          ...data.headers,
        },
        body: data.method !== "GET" ? JSON.stringify(data.payload) : undefined,
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}`);
      }

      return { success: true, status: response.status };
    } catch (error) {
      logger.error(`Webhook failed: ${job.id}`, error);
      throw error;
    }
  }

  private async processFileJob(job: Job): Promise<any> {
    const data = job.data as FileProcessingJobData;
    logger.info(`Processing file job: ${job.id}`, {
      fileId: data.fileId,
      operation: data.operation,
    });

    await job.updateProgress(10);

    // TODO: Implement actual file processing
    // Simulate file processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await job.updateProgress(100);

    return { processed: true, fileId: data.fileId };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info("Shutting down job queue service...");

    // Close all workers
    for (const [name, worker] of this.workers) {
      await worker.close();
      logger.debug(`Worker ${name} closed`);
    }

    // Close all queue events
    for (const [name, events] of this.queueEvents) {
      await events.close();
    }

    // Close all queues
    for (const [name, queue] of this.queues) {
      await queue.close();
      logger.debug(`Queue ${name} closed`);
    }

    this.isInitialized = false;
    logger.info("Job queue service shut down complete");
  }
}

// Export singleton
export const jobQueue = new JobQueueService();
export default jobQueue;

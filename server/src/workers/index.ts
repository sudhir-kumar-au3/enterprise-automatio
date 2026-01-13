/**
 * Job Workers - Process background jobs
 *
 * Run separately: npm run worker
 */

import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import nodemailer from "nodemailer";
import config from "../config";
import logger from "../utils/logger";
import { JobType } from "../services/jobQueue.service";

// Redis connection
const connection = new IORedis({
  host: config.redis?.host || "localhost",
  port: config.redis?.port || 6379,
  password: config.redis?.password || undefined,
  maxRetriesPerRequest: null,
});

// Email transporter
const emailTransporter = nodemailer.createTransport({
  host: config.email?.host || "smtp.gmail.com",
  port: config.email?.port || 587,
  secure: false,
  auth: {
    user: config.email?.user,
    pass: config.email?.password,
  },
});

// Email templates
const EMAIL_TEMPLATES: Record<
  string,
  (data: any) => { subject: string; html: string }
> = {
  "task-assigned": (data) => ({
    subject: `You've been assigned: ${data.taskTitle}`,
    html: `
      <h2>New Task Assignment</h2>
      <p>Hi ${data.userName},</p>
      <p><strong>${data.assignedBy}</strong> has assigned you a new task:</p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <h3 style="margin: 0 0 10px 0;">${data.taskTitle}</h3>
        <p style="margin: 0; color: #666;">${
          data.taskDescription || "No description"
        }</p>
        <p style="margin: 10px 0 0 0;"><strong>Due:</strong> ${
          data.dueDate || "No due date"
        }</p>
        <p style="margin: 5px 0 0 0;"><strong>Priority:</strong> ${
          data.priority || "Normal"
        }</p>
      </div>
      <a href="${
        data.taskUrl
      }" style="display: inline-block; background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Task</a>
    `,
  }),

  "task-updated": (data) => ({
    subject: `Task updated: ${data.taskTitle}`,
    html: `
      <h2>Task Updated</h2>
      <p>Hi ${data.userName},</p>
      <p>A task you're involved with has been updated:</p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <h3 style="margin: 0 0 10px 0;">${data.taskTitle}</h3>
        <p><strong>Changes:</strong></p>
        <ul>
          ${Object.entries(data.changes || {})
            .map(([key, value]) => `<li>${key}: ${value}</li>`)
            .join("")}
        </ul>
      </div>
      <a href="${
        data.taskUrl
      }" style="display: inline-block; background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Task</a>
    `,
  }),

  mention: (data) => ({
    subject: `${data.mentionedBy} mentioned you`,
    html: `
      <h2>You were mentioned</h2>
      <p>Hi ${data.userName},</p>
      <p><strong>${data.mentionedBy}</strong> mentioned you in ${data.contextType}:</p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <h3 style="margin: 0 0 10px 0;">${data.contextTitle}</h3>
        <p style="margin: 0; color: #666;">"${data.excerpt}"</p>
      </div>
      <a href="${data.url}" style="display: inline-block; background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View</a>
    `,
  }),

  welcome: (data) => ({
    subject: `Welcome to Pulsework.io, ${data.name}!`,
    html: `
      <h2>Welcome to Pulsework.io! 🎉</h2>
      <p>Hi ${data.name},</p>
      <p>Your account has been created successfully. Here's how to get started:</p>
      <ol>
        <li>Complete your profile</li>
        <li>Join or create a team</li>
        <li>Create your first task</li>
      </ol>
      <a href="${data.loginUrl}" style="display: inline-block; background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Get Started</a>
    `,
  }),

  "password-reset": (data) => ({
    subject: "Reset your password",
    html: `
      <h2>Password Reset Request</h2>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      <a href="${data.resetUrl}" style="display: inline-block; background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 15px 0;">Reset Password</a>
      <p style="color: #666; font-size: 12px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
    `,
  }),

  "daily-digest": (data) => ({
    subject: `Your Daily Digest - ${new Date().toLocaleDateString()}`,
    html: `
      <h2>Daily Digest 📋</h2>
      <p>Hi ${data.userName},</p>
      
      <h3>Tasks Due Today (${data.tasksDueToday?.length || 0})</h3>
      ${
        data.tasksDueToday?.length
          ? `
        <ul>
          ${data.tasksDueToday.map((t: any) => `<li>${t.title}</li>`).join("")}
        </ul>
      `
          : '<p style="color: #666;">No tasks due today! 🎉</p>'
      }
      
      <h3>Overdue Tasks (${data.overdueTasks?.length || 0})</h3>
      ${
        data.overdueTasks?.length
          ? `
        <ul style="color: #dc2626;">
          ${data.overdueTasks.map((t: any) => `<li>${t.title}</li>`).join("")}
        </ul>
      `
          : '<p style="color: #666;">No overdue tasks!</p>'
      }
      
      <h3>Recent Activity</h3>
      <p>${data.activityCount || 0} updates in your teams yesterday</p>
      
      <a href="${
        data.dashboardUrl
      }" style="display: inline-block; background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>
    `,
  }),
};

// Process email jobs
async function processEmailJob(job: Job): Promise<void> {
  const { data } = job;

  switch (job.name) {
    case JobType.SEND_EMAIL:
      await emailTransporter.sendMail({
        from: config.email?.from || "noreply@teamhub.com",
        to: data.to,
        subject: data.subject,
        html: data.html || data.template,
        attachments: data.attachments,
      });
      break;

    case JobType.SEND_TASK_NOTIFICATION:
      const template = EMAIL_TEMPLATES[`task-${data.type}`];
      if (template) {
        const { subject, html } = template(data);
        await emailTransporter.sendMail({
          from: config.email?.from || "noreply@teamhub.com",
          to: data.userEmail,
          subject,
          html,
        });
      }
      break;

    case JobType.SEND_MENTION_NOTIFICATION:
      const mentionTemplate = EMAIL_TEMPLATES["mention"];
      if (mentionTemplate) {
        const { subject, html } = mentionTemplate(data);
        await emailTransporter.sendMail({
          from: config.email?.from || "noreply@teamhub.com",
          to: data.userEmail,
          subject,
          html,
        });
      }
      break;

    case JobType.SEND_WELCOME_EMAIL:
      const welcomeTemplate = EMAIL_TEMPLATES["welcome"];
      if (welcomeTemplate) {
        const { subject, html } = welcomeTemplate(data);
        await emailTransporter.sendMail({
          from: config.email?.from || "noreply@teamhub.com",
          to: data.email,
          subject,
          html,
        });
      }
      break;

    case JobType.SEND_PASSWORD_RESET:
      const resetTemplate = EMAIL_TEMPLATES["password-reset"];
      if (resetTemplate) {
        const { subject, html } = resetTemplate({
          resetUrl: `${config.frontendUrl}/reset-password?token=${data.resetToken}`,
        });
        await emailTransporter.sendMail({
          from: config.email?.from || "noreply@teamhub.com",
          to: data.email,
          subject,
          html,
        });
      }
      break;

    case JobType.SEND_DAILY_DIGEST:
      // Fetch users who want daily digests and send
      logger.info("Processing daily digest job");
      // Implementation would fetch users from DB and send individual emails
      break;

    default:
      logger.warn(`Unknown email job type: ${job.name}`);
  }

  logger.info(`Email sent: ${job.name}`, { to: data.to || data.email });
}

// Process report jobs
async function processReportJob(job: Job): Promise<string> {
  const { data } = job;

  logger.info(`Processing report job: ${job.name}`, {
    type: data.type,
    format: data.format,
  });

  // Simulate report generation
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // In real implementation:
  // 1. Fetch data from database
  // 2. Generate report (PDF, CSV, Excel)
  // 3. Upload to S3
  // 4. Return download URL

  const reportUrl = `https://storage.example.com/reports/${job.id}.${data.format}`;

  logger.info(`Report generated: ${reportUrl}`);
  return reportUrl;
}

// Process file jobs
async function processFileJob(job: Job): Promise<void> {
  const { data } = job;

  logger.info(`Processing file job: ${job.name}`, { fileId: data.fileId });

  // In real implementation:
  // 1. Download file from S3
  // 2. Process with sharp (thumbnails, compression)
  // 3. Upload processed files back to S3
  // 4. Update database with new URLs

  for (const operation of data.operations || []) {
    switch (operation) {
      case "thumbnail":
        logger.debug(`Generating thumbnails for ${data.fileId}`);
        // Use sharp to generate thumbnails
        break;
      case "compress":
        logger.debug(`Compressing ${data.fileId}`);
        break;
      case "convert":
        logger.debug(`Converting ${data.fileId}`);
        break;
    }
  }
}

// Process maintenance jobs
async function processMaintenanceJob(job: Job): Promise<void> {
  const { data } = job;

  logger.info(`Processing maintenance job: ${job.name}`);

  switch (job.name) {
    case JobType.CLEANUP_OLD_FILES:
      logger.info(`Cleaning files older than ${data.olderThanDays} days`);
      // Delete old files from S3 and database
      break;

    case JobType.CLEANUP_EXPIRED_TOKENS:
      logger.info("Cleaning expired tokens");
      // Delete expired refresh tokens, password reset tokens, etc.
      break;

    case JobType.ARCHIVE_COMPLETED_TASKS:
      logger.info(
        `Archiving tasks completed more than ${data.olderThanDays} days ago`
      );
      // Move old completed tasks to archive collection
      break;
  }
}

// Process webhook jobs
async function processWebhookJob(job: Job): Promise<void> {
  const { data } = job;

  logger.info(`Sending webhook: ${data.event} to ${data.url}`);

  const response = await fetch(data.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...data.headers,
    },
    body: JSON.stringify({
      event: data.event,
      payload: data.payload,
      timestamp: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Webhook failed: ${response.status} ${response.statusText}`
    );
  }

  logger.info(`Webhook sent successfully: ${data.event}`);
}

// Create workers
function createWorkers(): Worker[] {
  const workers: Worker[] = [];

  // Email worker
  const emailWorker = new Worker(
    "email-queue",
    async (job) => processEmailJob(job),
    {
      connection,
      concurrency: 5,
      limiter: {
        max: 10,
        duration: 1000, // 10 emails per second max
      },
    }
  );
  workers.push(emailWorker);

  // Reports worker
  const reportsWorker = new Worker(
    "reports-queue",
    async (job) => processReportJob(job),
    {
      connection,
      concurrency: 2, // Reports are heavy
    }
  );
  workers.push(reportsWorker);

  // Processing worker
  const processingWorker = new Worker(
    "processing-queue",
    async (job) => processFileJob(job),
    {
      connection,
      concurrency: 3,
    }
  );
  workers.push(processingWorker);

  // Maintenance worker
  const maintenanceWorker = new Worker(
    "maintenance-queue",
    async (job) => processMaintenanceJob(job),
    {
      connection,
      concurrency: 1, // Run one at a time
    }
  );
  workers.push(maintenanceWorker);

  // Webhooks worker
  const webhooksWorker = new Worker(
    "webhooks-queue",
    async (job) => processWebhookJob(job),
    {
      connection,
      concurrency: 10,
      limiter: {
        max: 50,
        duration: 1000, // 50 webhooks per second max
      },
    }
  );
  workers.push(webhooksWorker);

  // Setup error handlers for all workers
  workers.forEach((worker) => {
    worker.on("completed", (job) => {
      logger.debug(`Job ${job.id} completed on ${worker.name}`);
    });

    worker.on("failed", (job, err) => {
      logger.error(`Job ${job?.id} failed on ${worker.name}`, {
        error: err.message,
      });
    });

    worker.on("error", (err) => {
      logger.error(`Worker ${worker.name} error`, { error: err.message });
    });
  });

  return workers;
}

// Main entry point for worker process
async function main(): Promise<void> {
  logger.info("Starting job workers...");

  const workers = createWorkers();

  logger.info(`Started ${workers.length} workers`, {
    queues: workers.map((w) => w.name),
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Shutting down workers...`);

    await Promise.all(workers.map((w) => w.close()));
    await connection.quit();

    logger.info("Workers shut down complete");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

// Run if executed directly
main().catch((err) => {
  logger.error("Worker startup failed", err);
  process.exit(1);
});

export { createWorkers };

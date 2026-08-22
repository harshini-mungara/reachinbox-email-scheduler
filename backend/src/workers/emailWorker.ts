import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../config/redis';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { RateLimiterService } from '../services/rateLimiter';
import { EmailSenderService } from '../services/emailSender';
import { addEmailJob, removeEmailJob } from '../queues/emailQueue';

let worker: Worker | null = null;

/**
 * Main job processor.
 * Ensures strict state-transition checks for idempotency.
 */
export const processEmailJob = async (job: Job<{ emailId: string }>) => {
  const { emailId } = job.data;
  console.log(`🤖 Worker processing job ${job.id} for Email: ${emailId}`);

  try {
    // 1. Idempotency Lock: Update status from SCHEDULED or RATE_LIMITED to PROCESSING
    // This atomic transaction ensures only one worker thread handles this email.
    const updateResult = await prisma.email.updateMany({
      where: {
        id: emailId,
        status: { in: ['SCHEDULED', 'RATE_LIMITED'] },
      },
      data: {
        status: 'PROCESSING',
        attempts: { increment: 1 },
      },
    });

    if (updateResult.count === 0) {
      console.log(`⚠️ Email ${emailId} already processed or in-progress. Skipping.`);
      return;
    }

    // 2. Fetch full email and campaign info
    const email = await prisma.email.findUnique({
      where: { id: emailId },
      include: {
        campaign: true,
      },
    });

    if (!email) {
      console.error(`❌ Email record not found in DB: ${emailId}`);
      return;
    }

    // 3. Rate Limit Check
    const rateLimit = await RateLimiterService.checkAndIncrement(
      email.campaign.userId,
      email.campaign.hourlyLimit
    );

    if (rateLimit.limited) {
      console.log(
        `🚨 Rate limit reached for User ${email.campaign.userId}. (Limit: ${rateLimit.limit}). Rescheduling...`
      );

      // Decrement the counter back since we are rolling this attempt back
      await RateLimiterService.decrement(email.campaign.userId);

      // Update email status in DB to RATE_LIMITED
      await prisma.email.update({
        where: { id: emailId },
        data: {
          status: 'RATE_LIMITED',
          errorMessage: `Rate limit of ${rateLimit.limit} emails/hour reached. Rescheduled.`,
        },
      });

      // Calculate delay until next hour window
      const rescheduleDelay = RateLimiterService.getMsUntilNextHour();
      
      // Remove current job references and schedule a new delayed job
      await removeEmailJob(emailId);
      await addEmailJob(emailId, rescheduleDelay);

      console.log(`⏳ Rescheduled Email ${emailId} for next hour (+${rescheduleDelay}ms)`);
      return;
    }

    // 4. Send Email via Nodemailer (Ethereal)
    try {
      const sendResult = await EmailSenderService.sendEmail(
        email.recipient,
        email.campaign.subject,
        email.campaign.body
      );

      // 5. Update Status on Success
      await prisma.email.update({
        where: { id: emailId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          etherealPreviewUrl: sendResult.previewUrl,
          errorMessage: null,
        },
      });
      console.log(`✅ Successfully sent Email ${emailId}`);
    } catch (sendError: any) {
      console.error(`❌ Send error for Email ${emailId}:`, sendError);

      const maxAttempts = job.opts.attempts || 3;
      const attemptsMade = job.attemptsMade + 1; // +1 for the current run

      if (attemptsMade < maxAttempts) {
        // Roll back status to SCHEDULED so BullMQ retry attempts can process it
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'SCHEDULED',
            errorMessage: `Attempt ${attemptsMade} failed: ${sendError.message}`,
          },
        });
        throw sendError; // Re-throw to trigger BullMQ retry backoff
      } else {
        // Mark as permanently FAILED
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'FAILED',
            errorMessage: `All attempts failed. Last error: ${sendError.message}`,
          },
        });
      }
    }
  } catch (error) {
    console.error(`❌ System error in Worker processing job ${job.id}:`, error);
    // Ensure we don't swallow system errors entirely
    throw error;
  }
};

/**
 * Starts the BullMQ worker.
 */
export const startWorker = () => {
  if (worker) {
    console.log('Worker is already running.');
    return;
  }

  const concurrency = env.WORKER_CONCURRENCY;
  console.log(`⚙️ Starting BullMQ Worker with concurrency: ${concurrency}`);

  worker = new Worker('email-queue', processEmailJob, {
    connection: getRedisConnection(),
    concurrency,
  });

  worker.on('completed', (job) => {
    console.log(`✨ Job ${job.id} completed!`);
  });

  worker.on('failed', (job, err) => {
    console.error(`💥 Job ${job?.id} failed with error: ${err.message}`);
  });

  worker.on('error', (err) => {
    console.error('🔥 Worker connection error:', err);
  });
};

/**
 * Stops the BullMQ worker gracefully.
 */
export const stopWorker = async () => {
  if (worker) {
    console.log('🛑 Stopping BullMQ Worker gracefully...');
    await worker.close();
    worker = null;
    console.log('🛑 Worker stopped.');
  }
};

import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis';

// Instantiate the email queue using the Redis connection helper
export const emailQueue = new Queue('email-queue', {
  connection: getRedisConnection(),
});

/**
 * Adds a delayed email job to the queue.
 * Uses the Email database record ID as the BullMQ jobId to enforce uniqueness.
 */
export const addEmailJob = async (emailId: string, delayMs: number) => {
  await emailQueue.add(
    'send-email',
    { emailId },
    {
      jobId: emailId, // Enforce jobId = Email ID
      delay: Math.max(0, delayMs),
      attempts: 3, // Standard BullMQ retry mechanism
      backoff: {
        type: 'exponential',
        delay: 10000, // 10s initial delay before retrying on general errors
      },
      removeOnComplete: true, // Automatically remove completed jobs to allow reuse of jobId on rescheduling
      removeOnFail: true,     // Automatically remove failed jobs to allow reuse of jobId on rescheduling
    }
  );
  console.log(`⏰ Queued job for Email ID: ${emailId} with delay: ${delayMs}ms`);
};

/**
 * Removes a job from the queue by its ID if it exists.
 */
export const removeEmailJob = async (emailId: string) => {
  const job = await emailQueue.getJob(emailId);
  if (job) {
    await job.remove();
    console.log(`🗑️ Removed job ${emailId} from queue`);
  }
};

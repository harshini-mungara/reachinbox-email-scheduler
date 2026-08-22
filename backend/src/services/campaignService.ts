import crypto from 'crypto';
import { prisma } from '../config/db';
import { addEmailJob } from '../queues/emailQueue';

export interface CreateCampaignInput {
  userId: string;
  subject: string;
  body: string;
  startTime: Date;
  delaySeconds: number;
  hourlyLimit: number;
  recipients: string[];
}

export class CampaignService {
  /**
   * Creates a Campaign and schedules delayed email sending jobs.
   * Generates email IDs client/server-side for atomic insertion and immediate scheduling.
   */
  public static async createCampaign(input: CreateCampaignInput) {
    const { userId, subject, body, startTime, delaySeconds, hourlyLimit, recipients } = input;

    // Deduplicate recipients
    const uniqueRecipients = Array.from(new Set(recipients.map((r) => r.trim().toLowerCase())));

    if (uniqueRecipients.length === 0) {
      throw new Error('Campaign must have at least one valid recipient email.');
    }

    // Pre-generate campaign and email records with UUIDs
    const campaignId = crypto.randomUUID();
    const now = new Date();

    const emailsToCreate = uniqueRecipients.map((recipient, i) => {
      const emailId = crypto.randomUUID();
      // Calculate scheduled time spacing them out by delaySeconds
      const scheduledTime = new Date(startTime.getTime() + i * delaySeconds * 1000);
      
      return {
        id: emailId,
        campaignId,
        recipient,
        scheduledAt: scheduledTime,
        status: 'SCHEDULED' as const,
      };
    });

    // Run database transaction to store campaign and emails
    const result = await prisma.$transaction(async (tx) => {
      const campaign = await tx.campaign.create({
        data: {
          id: campaignId,
          userId,
          subject,
          body,
          startTime,
          delaySeconds,
          hourlyLimit,
        },
      });

      await tx.email.createMany({
        data: emailsToCreate,
      });

      return { campaign, emails: emailsToCreate };
    });

    // Schedule delayed BullMQ jobs
    for (const email of result.emails) {
      const delayMs = email.scheduledAt.getTime() - now.getTime();
      // Note: addEmailJob will handle negative delays safely by using delay = 0
      await addEmailJob(email.id, delayMs);
    }

    return result.campaign;
  }
}

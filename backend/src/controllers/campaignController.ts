import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { CampaignService } from '../services/campaignService';

// Schema for input validation using Zod
const createCampaignSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  startTime: z.string().transform((val) => {
    const d = new Date(val);
    if (isNaN(d.getTime())) {
      throw new Error('Invalid start time date');
    }
    return d;
  }),
  delaySeconds: z.coerce.number().min(0, 'Delay seconds must be 0 or greater').default(0),
  hourlyLimit: z.coerce.number().min(1, 'Hourly limit must be at least 1').default(200),
  recipients: z.array(z.string().email('Invalid recipient email address')).min(1, 'At least one recipient is required'),
});

export class CampaignController {
  /**
   * Handles creating a new campaign and queueing email jobs.
   */
  public static async createCampaign(req: AuthenticatedRequest, res: Response) {
    try {
      const parsedInput = createCampaignSchema.safeParse(req.body);
      
      if (!parsedInput.success) {
        return res.status(400).json({
          error: 'Validation Error',
          details: parsedInput.error.format(),
        });
      }

      const { subject, body, startTime, delaySeconds, hourlyLimit, recipients } = parsedInput.data;
      const userId = req.user!.id; // Authenticated via middleware

      console.log(`📣 Campaign creation requested for User: ${userId} with ${recipients.length} recipients.`);

      const campaign = await CampaignService.createCampaign({
        userId,
        subject,
        body,
        startTime,
        delaySeconds,
        hourlyLimit,
        recipients,
      });

      return res.status(201).json({
        message: 'Campaign created and emails scheduled successfully.',
        campaign,
      });
    } catch (error: any) {
      console.error('❌ Campaign Creation Controller Error:', error);
      return res.status(500).json({
        error: 'Campaign Creation Failed',
        message: error.message,
      });
    }
  }
}

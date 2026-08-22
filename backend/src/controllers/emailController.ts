import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

export class EmailController {
  /**
   * Fetches scheduled (un-sent) emails for the authenticated user.
   * Statuses: SCHEDULED, PROCESSING, RATE_LIMITED
   */
  public static async getScheduledEmails(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;

      const emails = await prisma.email.findMany({
        where: {
          campaign: {
            userId: userId,
          },
          status: {
            in: ['SCHEDULED', 'PROCESSING', 'RATE_LIMITED'],
          },
        },
        include: {
          campaign: {
            select: {
              subject: true,
              startTime: true,
            },
          },
        },
        orderBy: {
          scheduledAt: 'asc',
        },
      });

      return res.status(200).json(emails);
    } catch (error: any) {
      console.error('❌ Get Scheduled Emails Controller Error:', error);
      return res.status(500).json({
        error: 'Failed to retrieve scheduled emails',
        message: error.message,
      });
    }
  }

  /**
   * Fetches sent and failed emails for the authenticated user.
   * Statuses: SENT, FAILED
   */
  public static async getSentEmails(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;

      const emails = await prisma.email.findMany({
        where: {
          campaign: {
            userId: userId,
          },
          status: {
            in: ['SENT', 'FAILED'],
          },
        },
        include: {
          campaign: {
            select: {
              subject: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      return res.status(200).json(emails);
    } catch (error: any) {
      console.error('❌ Get Sent Emails Controller Error:', error);
      return res.status(500).json({
        error: 'Failed to retrieve sent/failed emails',
        message: error.message,
      });
    }
  }

  /**
   * Fetches a single email by ID, checking authorization.
   */
  public static async getEmailById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const email = await prisma.email.findUnique({
        where: { id },
        include: {
          campaign: true,
        },
      });

      if (!email) {
        return res.status(404).json({
          error: 'Not Found',
          message: `Email with ID ${id} does not exist.`,
        });
      }

      if (email.campaign.userId !== userId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You are not authorized to view this email.',
        });
      }

      return res.status(200).json(email);
    } catch (error: any) {
      console.error('❌ Get Email By ID Controller Error:', error);
      return res.status(500).json({
        error: 'Failed to retrieve email details',
        message: error.message,
      });
    }
  }
}

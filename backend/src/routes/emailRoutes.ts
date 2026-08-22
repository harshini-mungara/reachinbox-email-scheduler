import { Router } from 'express';
import { EmailController } from '../controllers/emailController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Protect email routes with authentication
router.get('/scheduled', authenticate as any, EmailController.getScheduledEmails as any);
router.get('/sent', authenticate as any, EmailController.getSentEmails as any);
router.get('/:id', authenticate as any, EmailController.getEmailById as any);

export default router;

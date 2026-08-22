import { Router } from 'express';
import { CampaignController } from '../controllers/campaignController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Protect campaign route with authentication
router.post('/', authenticate as any, CampaignController.createCampaign as any);

export default router;

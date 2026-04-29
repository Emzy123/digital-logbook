import { Router } from 'express';
import {
  getNationalStatistics,
  getInstitutionalBreakdown,
  getTrendAnalysis,
  getSystemAlerts
} from '../controllers/itfOversightController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { UserRole } from '../models/User';

const router = Router();

// All routes require authentication and ITF admin role
router.use(authenticate);
router.use(authorize([UserRole.ITF_ADMIN, UserRole.SYSTEM_ADMIN]));

// National statistics and analytics
router.get('/national-statistics', getNationalStatistics);
router.get('/institutional-breakdown', getInstitutionalBreakdown);
router.get('/trend-analysis', getTrendAnalysis);
router.get('/system-alerts', getSystemAlerts);

export default router;

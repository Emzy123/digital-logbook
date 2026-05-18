import { Router } from 'express';
import { exportData } from '../controllers/exportController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { UserRole } from '../models/User';

const router = Router();

router.get(
  '/:entity',
  authenticate,
  authorize([UserRole.COORDINATOR, UserRole.ITF_ADMIN, UserRole.SYSTEM_ADMIN]),
  exportData
);

export default router;

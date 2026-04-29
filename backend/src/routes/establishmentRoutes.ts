import { Router } from 'express';
import { getEstablishments, createEstablishment } from '../controllers/establishmentController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { auditAction } from '../middleware/auditMiddleware';
import { UserRole } from '../models/User';

const router = Router();

router.use(authenticate);

// Everyone authenticated can view establishments
router.get('/', getEstablishments);

// Only admins can create new ones
router.use(authorize([UserRole.ITF_ADMIN, UserRole.COORDINATOR, UserRole.SYSTEM_ADMIN]));
router.post('/', auditAction('CREATE_ESTABLISHMENT'), createEstablishment);

export default router;

import { Router } from 'express';
import { 
  createCompanyRequest, 
  getCompanyRequests, 
  reviewCompanyRequest, 
  getCompanyRequestById 
} from '../controllers/companyRequestController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { UserRole } from '../models/User';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Student routes - create and view their own requests
router.post('/', authorize([UserRole.STUDENT]), createCompanyRequest);
router.get('/', authorize([UserRole.STUDENT, UserRole.COORDINATOR, UserRole.SYSTEM_ADMIN, UserRole.ITF_ADMIN]), getCompanyRequests);
router.get('/:id', authorize([UserRole.STUDENT, UserRole.COORDINATOR, UserRole.SYSTEM_ADMIN, UserRole.ITF_ADMIN]), getCompanyRequestById);

// Coordinator/Admin routes - review requests
router.patch('/:id/review', authorize([UserRole.COORDINATOR, UserRole.SYSTEM_ADMIN, UserRole.ITF_ADMIN]), reviewCompanyRequest);

export default router;

import { Router } from 'express';
import {
  getCoordinatorDashboard,
  getStudentAlerts,
  getSupervisorPerformance,
  reassignSupervisor,
  overrideApproval,
  exportITFData
} from '../controllers/coordinatorOversightController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { UserRole } from '../models/User';

const router = Router();

// All routes require authentication and coordinator role
router.use(authenticate);
router.use(authorize([UserRole.COORDINATOR, UserRole.SYSTEM_ADMIN, UserRole.ITF_ADMIN]));

// Dashboard and overview
router.get('/dashboard', getCoordinatorDashboard);

// Student monitoring and alerts
router.get('/alerts', getStudentAlerts);

// Supervisor management
router.get('/supervisors/performance', getSupervisorPerformance);
router.post('/supervisors/reassign', reassignSupervisor);

// Approval overrides
router.post('/override-approval', overrideApproval);

// Data export
router.get('/export', exportITFData);

export default router;

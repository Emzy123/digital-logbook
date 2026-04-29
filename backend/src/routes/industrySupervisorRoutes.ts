import { Router } from 'express';
import {
  getSupervisorDashboard,
  getAssignedStudents,
  getStudentLogHistory,
  compareStudentEntries,
  getSupervisorAnalytics
} from '../controllers/industrySupervisorController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { UserRole } from '../models/User';

const router = Router();

// All routes require authentication and industry supervisor role
router.use(authenticate);
router.use(authorize([UserRole.INDUSTRY_SUPERVISOR]));

// Dashboard and overview
router.get('/dashboard', getSupervisorDashboard);

// Student management
router.get('/students', getAssignedStudents);
router.get('/students/:studentId/logs', getStudentLogHistory);
router.get('/students/:studentId/compare', compareStudentEntries);

// Analytics and insights
router.get('/analytics', getSupervisorAnalytics);

export default router;

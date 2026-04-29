import { Router } from 'express';
import {
  getSchoolSupervisorDashboard,
  getCrossCompanyStudentOverview,
  getStudentDetailedReport,
  conductVirtualSupervisionVisit,
  getWeeklySummaryReports
} from '../controllers/schoolSupervisorController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { UserRole } from '../models/User';

const router = Router();

// All routes require authentication and school supervisor role
router.use(authenticate);
router.use(authorize([UserRole.SCHOOL_SUPERVISOR]));

// Dashboard and overview
router.get('/dashboard', getSchoolSupervisorDashboard);

// Student management across companies
router.get('/students', getCrossCompanyStudentOverview);
router.get('/students/:studentId/report', getStudentDetailedReport);

// Virtual supervision features
router.post('/students/:studentId/virtual-visit', conductVirtualSupervisionVisit);

// Reports and analytics
router.get('/weekly-summary', getWeeklySummaryReports);

export default router;

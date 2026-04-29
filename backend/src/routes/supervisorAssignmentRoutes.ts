import { Router } from 'express';
import {
  getSupervisorAssignments,
  createSupervisorAssignment,
  updateSupervisorAssignment,
  getUnassignedStudents,
  getAvailableSupervisors
} from '../controllers/supervisorAssignmentController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { UserRole } from '../models/User';

const router = Router();

// All routes require authentication
router.use(authenticate);

// View assignments - all authenticated users can see their relevant assignments
router.get('/', getSupervisorAssignments);

// Coordinator/Admin routes for managing assignments
router.post('/', authorize([UserRole.COORDINATOR, UserRole.SYSTEM_ADMIN, UserRole.ITF_ADMIN]), createSupervisorAssignment);
router.patch('/:id', authorize([UserRole.COORDINATOR, UserRole.SYSTEM_ADMIN, UserRole.ITF_ADMIN]), updateSupervisorAssignment);

// Helper endpoints for assignment interface
router.get('/unassigned-students', authorize([UserRole.COORDINATOR, UserRole.SYSTEM_ADMIN, UserRole.ITF_ADMIN]), getUnassignedStudents);
router.get('/available-supervisors', authorize([UserRole.COORDINATOR, UserRole.SYSTEM_ADMIN, UserRole.ITF_ADMIN]), getAvailableSupervisors);

export default router;

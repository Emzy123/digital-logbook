import { Router } from 'express';
import {
  getAssessmentRubric,
  createAssessment,
  submitAssessment,
  getAssessments,
  getAssessmentById,
  calculateFinalGrade
} from '../controllers/assessmentController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { UserRole } from '../models/User';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get assessment rubric
router.get('/rubric', getAssessmentRubric);

// Create assessment (requires supervisor role)
router.post('/', authorize([UserRole.INDUSTRY_SUPERVISOR, UserRole.SCHOOL_SUPERVISOR]), createAssessment);

// Submit assessment
router.post('/:id/submit', authorize([UserRole.INDUSTRY_SUPERVISOR, UserRole.SCHOOL_SUPERVISOR]), submitAssessment);

// Get assessments (filtered by role)
router.get('/', getAssessments);

// Get assessment by ID
router.get('/:id', getAssessmentById);

// Calculate final grade (requires coordinator or admin role)
router.post('/calculate-final-grade', authorize([UserRole.COORDINATOR, UserRole.SYSTEM_ADMIN, UserRole.ITF_ADMIN]), calculateFinalGrade);

export default router;

import { Router } from 'express';
import { 
    getAssignedStudents, 
    getStudentLogs, 
    reviewLog, 
    submitAssessment,
    reviewWeeklySummary,
    getStudentWeeklySummaries,
    logSupervisorVisit,
    getStudentVisits,
    getAssessmentStatus
} from '../controllers/supervisorController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { UserRole } from '../models/User';

const router = Router();
router.use(authenticate);
// Only supervisors can access
router.use(authorize([UserRole.INDUSTRY_SUPERVISOR, UserRole.SCHOOL_SUPERVISOR]));

router.get('/assigned-students', getAssignedStudents);
router.get('/students/:studentId/logs', getStudentLogs);
router.get('/students/:studentId/weekly-summaries', getStudentWeeklySummaries);
router.put('/logs/:id/review', reviewLog);
router.put('/weekly-summaries/:id/review', reviewWeeklySummary);
router.post('/students/:studentId/visits', logSupervisorVisit);
router.get('/students/:studentId/visits', getStudentVisits);
router.get('/students/:studentId/assessment-status', getAssessmentStatus);
router.post('/students/:studentId/assessment', submitAssessment);

export default router;

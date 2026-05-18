import { Router } from 'express';
import { 
  getSystemMetrics, 
  getFinalITFReportDoc, 
  getTrendAnalysis, 
  getRegionalComparisons, 
  getSupervisorPerformanceAnalytics,
  getGroupedStats
} from '../controllers/analyticsController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { UserRole } from '../models/User';

const router = Router();

router.use(authenticate);
router.use(authorize([UserRole.ITF_ADMIN, UserRole.COORDINATOR, UserRole.SYSTEM_ADMIN]));

router.get('/metrics', getSystemMetrics);
router.post('/generate-final-report', getFinalITFReportDoc);
router.get('/trends', getTrendAnalysis);
router.get('/regional-comparisons', getRegionalComparisons);
router.get('/supervisor-performance', getSupervisorPerformanceAnalytics);
router.get('/grouped', getGroupedStats);

export default router;

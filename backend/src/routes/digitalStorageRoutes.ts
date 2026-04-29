import { Router } from 'express';
import {
  storeDigitalRecord,
  retrieveDigitalRecord,
  searchDigitalRecords,
  getSkillsAnalytics,
  getCompanyRatings,
  getStudentOutcomes,
  exportData,
  implementRetentionPolicy,
  verifyDataIntegrity,
  getRecordAuditTrail,
  getStorageStatistics
} from '../controllers/digitalStorageController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { UserRole } from '../models/User';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Basic record operations
router.post('/records', storeDigitalRecord);
router.get('/records/:recordId', retrieveDigitalRecord);
router.get('/records/search', searchDigitalRecords);

// Analytics endpoints
router.get('/analytics/skills', getSkillsAnalytics);
router.get('/analytics/companies', getCompanyRatings);
router.get('/analytics/outcomes', getStudentOutcomes);

// Data export
router.post('/export', exportData);

// System administration (requires admin role)
router.post('/admin/retention-policy', authorize([UserRole.SYSTEM_ADMIN, UserRole.ITF_ADMIN]), implementRetentionPolicy);
router.post('/admin/verify-integrity', authorize([UserRole.SYSTEM_ADMIN, UserRole.ITF_ADMIN]), verifyDataIntegrity);
router.get('/admin/statistics', authorize([UserRole.SYSTEM_ADMIN, UserRole.ITF_ADMIN]), getStorageStatistics);

// Audit trail
router.get('/records/:recordId/audit', getRecordAuditTrail);

export default router;

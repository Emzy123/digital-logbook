import { Router } from 'express';
import { getAllUsers, getAuditLogs, bulkImportUsers, getSupervisors, getStudents, assignSupervisor, createSupervisor } from '../controllers/adminController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { auditAction } from '../middleware/auditMiddleware';
import { UserRole } from '../models/User';

const router = Router();
router.use(authenticate);
router.use(authorize([UserRole.ITF_ADMIN, UserRole.COORDINATOR, UserRole.SYSTEM_ADMIN]));

router.get('/users', getAllUsers);
router.get('/audit-logs', getAuditLogs);
router.post('/users/bulk', auditAction('BULK_IMPORT_USERS'), bulkImportUsers);

router.get('/supervisors', getSupervisors);
router.post('/supervisors/create', auditAction('CREATE_SUPERVISOR'), createSupervisor);
router.get('/students', getStudents);
router.post('/assignments', auditAction('ASSIGN_SUPERVISOR'), assignSupervisor);

export default router;

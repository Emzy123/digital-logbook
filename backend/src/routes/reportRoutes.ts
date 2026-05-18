import { Router } from 'express';
import { getFinalReportPdf } from '../controllers/reportController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

// Endpoint for generating a student's final report PDF
router.get('/pdf/final/:studentId', authenticate, getFinalReportPdf);

export default router;

import { Router } from 'express';
import { createOrUpdateSummary, getSummaries, downloadWeeklyPdf } from '../controllers/weeklySummaryController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();
router.use(authenticate);

router.get('/', getSummaries);
router.post('/', createOrUpdateSummary);
router.get('/:id/pdf', downloadWeeklyPdf);

export default router;

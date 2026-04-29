import { Router } from 'express';
import {
  createLogEntry,
  getLogEntries,
  updateLogEntry,
  getLogEntryById
} from '../controllers/logEntryController';
import { authenticate } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

router.use(authenticate);

router.post('/', upload.array('files', 5), createLogEntry);
router.get('/', getLogEntries);
router.get('/:id', getLogEntryById);
router.put('/:id', upload.array('files', 5), updateLogEntry);

export default router;

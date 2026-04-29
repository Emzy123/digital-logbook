import { Router } from 'express';
import {
  addComment,
  getComments,
  editComment,
  deleteComment,
  getCommentThreads
} from '../controllers/supervisorCommentController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { UserRole } from '../models/User';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Add comment to log entry
router.post('/', addComment);

// Get comments for log entry
router.get('/log/:log_entry_id', getComments);

// Get threaded comments for log entry
router.get('/log/:log_entry_id/threads', getCommentThreads);

// Edit comment
router.patch('/:id', editComment);

// Delete comment
router.delete('/:id', deleteComment);

export default router;

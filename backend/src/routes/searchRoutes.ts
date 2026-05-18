import { Router } from 'express';
import { search } from '../controllers/searchController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticate, search);

export default router;

import { Router } from 'express';
import { getProfile, updateProfile, uploadProfileDoc } from '../controllers/studentController';
import { authenticate } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

router.use(authenticate);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/profile/upload', upload.fields([
  { name: 'placement_letter', maxCount: 1 },
  { name: 'passport_photo', maxCount: 1 }
]), uploadProfileDoc);

export default router;

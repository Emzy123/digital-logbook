"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const studentController_1 = require("../controllers/studentController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const uploadMiddleware_1 = require("../middleware/uploadMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticate);
router.get('/profile', studentController_1.getProfile);
router.put('/profile', studentController_1.updateProfile);
router.post('/profile/upload', uploadMiddleware_1.upload.fields([
    { name: 'placement_letter', maxCount: 1 },
    { name: 'passport_photo', maxCount: 1 }
]), studentController_1.uploadProfileDoc);
exports.default = router;

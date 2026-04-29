"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const itfOversightController_1 = require("../controllers/itfOversightController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const User_1 = require("../models/User");
const router = (0, express_1.Router)();
// All routes require authentication and ITF admin role
router.use(authMiddleware_1.authenticate);
router.use((0, authMiddleware_1.authorize)([User_1.UserRole.ITF_ADMIN, User_1.UserRole.SYSTEM_ADMIN]));
// National statistics and analytics
router.get('/national-statistics', itfOversightController_1.getNationalStatistics);
router.get('/institutional-breakdown', itfOversightController_1.getInstitutionalBreakdown);
router.get('/trend-analysis', itfOversightController_1.getTrendAnalysis);
router.get('/system-alerts', itfOversightController_1.getSystemAlerts);
exports.default = router;

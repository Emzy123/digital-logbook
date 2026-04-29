"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const industrySupervisorController_1 = require("../controllers/industrySupervisorController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const User_1 = require("../models/User");
const router = (0, express_1.Router)();
// All routes require authentication and industry supervisor role
router.use(authMiddleware_1.authenticate);
router.use((0, authMiddleware_1.authorize)([User_1.UserRole.INDUSTRY_SUPERVISOR]));
// Dashboard and overview
router.get('/dashboard', industrySupervisorController_1.getSupervisorDashboard);
// Student management
router.get('/students', industrySupervisorController_1.getAssignedStudents);
router.get('/students/:studentId/logs', industrySupervisorController_1.getStudentLogHistory);
router.get('/students/:studentId/compare', industrySupervisorController_1.compareStudentEntries);
// Analytics and insights
router.get('/analytics', industrySupervisorController_1.getSupervisorAnalytics);
exports.default = router;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const schoolSupervisorController_1 = require("../controllers/schoolSupervisorController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const User_1 = require("../models/User");
const router = (0, express_1.Router)();
// All routes require authentication and school supervisor role
router.use(authMiddleware_1.authenticate);
router.use((0, authMiddleware_1.authorize)([User_1.UserRole.SCHOOL_SUPERVISOR]));
// Dashboard and overview
router.get('/dashboard', schoolSupervisorController_1.getSchoolSupervisorDashboard);
// Student management across companies
router.get('/students', schoolSupervisorController_1.getCrossCompanyStudentOverview);
router.get('/students/:studentId/report', schoolSupervisorController_1.getStudentDetailedReport);
// Virtual supervision features
router.post('/students/:studentId/virtual-visit', schoolSupervisorController_1.conductVirtualSupervisionVisit);
// Reports and analytics
router.get('/weekly-summary', schoolSupervisorController_1.getWeeklySummaryReports);
exports.default = router;

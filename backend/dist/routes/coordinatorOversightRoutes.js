"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const coordinatorOversightController_1 = require("../controllers/coordinatorOversightController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const User_1 = require("../models/User");
const router = (0, express_1.Router)();
// All routes require authentication and coordinator role
router.use(authMiddleware_1.authenticate);
router.use((0, authMiddleware_1.authorize)([User_1.UserRole.COORDINATOR, User_1.UserRole.SYSTEM_ADMIN, User_1.UserRole.ITF_ADMIN]));
// Dashboard and overview
router.get('/dashboard', coordinatorOversightController_1.getCoordinatorDashboard);
// Student monitoring and alerts
router.get('/alerts', coordinatorOversightController_1.getStudentAlerts);
// Supervisor management
router.get('/supervisors/performance', coordinatorOversightController_1.getSupervisorPerformance);
router.post('/supervisors/reassign', coordinatorOversightController_1.reassignSupervisor);
// Approval overrides
router.post('/override-approval', coordinatorOversightController_1.overrideApproval);
// Data export
router.get('/export', coordinatorOversightController_1.exportITFData);
exports.default = router;

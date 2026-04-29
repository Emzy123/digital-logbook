"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supervisorAssignmentController_1 = require("../controllers/supervisorAssignmentController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const User_1 = require("../models/User");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(authMiddleware_1.authenticate);
// View assignments - all authenticated users can see their relevant assignments
router.get('/', supervisorAssignmentController_1.getSupervisorAssignments);
// Coordinator/Admin routes for managing assignments
router.post('/', (0, authMiddleware_1.authorize)([User_1.UserRole.COORDINATOR, User_1.UserRole.SYSTEM_ADMIN, User_1.UserRole.ITF_ADMIN]), supervisorAssignmentController_1.createSupervisorAssignment);
router.patch('/:id', (0, authMiddleware_1.authorize)([User_1.UserRole.COORDINATOR, User_1.UserRole.SYSTEM_ADMIN, User_1.UserRole.ITF_ADMIN]), supervisorAssignmentController_1.updateSupervisorAssignment);
// Helper endpoints for assignment interface
router.get('/unassigned-students', (0, authMiddleware_1.authorize)([User_1.UserRole.COORDINATOR, User_1.UserRole.SYSTEM_ADMIN, User_1.UserRole.ITF_ADMIN]), supervisorAssignmentController_1.getUnassignedStudents);
router.get('/available-supervisors', (0, authMiddleware_1.authorize)([User_1.UserRole.COORDINATOR, User_1.UserRole.SYSTEM_ADMIN, User_1.UserRole.ITF_ADMIN]), supervisorAssignmentController_1.getAvailableSupervisors);
exports.default = router;

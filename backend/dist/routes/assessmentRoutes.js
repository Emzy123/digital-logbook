"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const assessmentController_1 = require("../controllers/assessmentController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const User_1 = require("../models/User");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(authMiddleware_1.authenticate);
// Get assessment rubric
router.get('/rubric', assessmentController_1.getAssessmentRubric);
// Create assessment (requires supervisor role)
router.post('/', (0, authMiddleware_1.authorize)([User_1.UserRole.INDUSTRY_SUPERVISOR, User_1.UserRole.SCHOOL_SUPERVISOR]), assessmentController_1.createAssessment);
// Submit assessment
router.post('/:id/submit', (0, authMiddleware_1.authorize)([User_1.UserRole.INDUSTRY_SUPERVISOR, User_1.UserRole.SCHOOL_SUPERVISOR]), assessmentController_1.submitAssessment);
// Get assessments (filtered by role)
router.get('/', assessmentController_1.getAssessments);
// Get assessment by ID
router.get('/:id', assessmentController_1.getAssessmentById);
// Calculate final grade (requires coordinator or admin role)
router.post('/calculate-final-grade', (0, authMiddleware_1.authorize)([User_1.UserRole.COORDINATOR, User_1.UserRole.SYSTEM_ADMIN, User_1.UserRole.ITF_ADMIN]), assessmentController_1.calculateFinalGrade);
exports.default = router;

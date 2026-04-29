"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const companyRequestController_1 = require("../controllers/companyRequestController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const User_1 = require("../models/User");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(authMiddleware_1.authenticate);
// Student routes - create and view their own requests
router.post('/', (0, authMiddleware_1.authorize)([User_1.UserRole.STUDENT]), companyRequestController_1.createCompanyRequest);
router.get('/', (0, authMiddleware_1.authorize)([User_1.UserRole.STUDENT, User_1.UserRole.COORDINATOR, User_1.UserRole.SYSTEM_ADMIN, User_1.UserRole.ITF_ADMIN]), companyRequestController_1.getCompanyRequests);
router.get('/:id', (0, authMiddleware_1.authorize)([User_1.UserRole.STUDENT, User_1.UserRole.COORDINATOR, User_1.UserRole.SYSTEM_ADMIN, User_1.UserRole.ITF_ADMIN]), companyRequestController_1.getCompanyRequestById);
// Coordinator/Admin routes - review requests
router.patch('/:id/review', (0, authMiddleware_1.authorize)([User_1.UserRole.COORDINATOR, User_1.UserRole.SYSTEM_ADMIN, User_1.UserRole.ITF_ADMIN]), companyRequestController_1.reviewCompanyRequest);
exports.default = router;

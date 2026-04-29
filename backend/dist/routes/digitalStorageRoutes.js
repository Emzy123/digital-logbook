"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const digitalStorageController_1 = require("../controllers/digitalStorageController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const User_1 = require("../models/User");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(authMiddleware_1.authenticate);
// Basic record operations
router.post('/records', digitalStorageController_1.storeDigitalRecord);
router.get('/records/:recordId', digitalStorageController_1.retrieveDigitalRecord);
router.get('/records/search', digitalStorageController_1.searchDigitalRecords);
// Analytics endpoints
router.get('/analytics/skills', digitalStorageController_1.getSkillsAnalytics);
router.get('/analytics/companies', digitalStorageController_1.getCompanyRatings);
router.get('/analytics/outcomes', digitalStorageController_1.getStudentOutcomes);
// Data export
router.post('/export', digitalStorageController_1.exportData);
// System administration (requires admin role)
router.post('/admin/retention-policy', (0, authMiddleware_1.authorize)([User_1.UserRole.SYSTEM_ADMIN, User_1.UserRole.ITF_ADMIN]), digitalStorageController_1.implementRetentionPolicy);
router.post('/admin/verify-integrity', (0, authMiddleware_1.authorize)([User_1.UserRole.SYSTEM_ADMIN, User_1.UserRole.ITF_ADMIN]), digitalStorageController_1.verifyDataIntegrity);
router.get('/admin/statistics', (0, authMiddleware_1.authorize)([User_1.UserRole.SYSTEM_ADMIN, User_1.UserRole.ITF_ADMIN]), digitalStorageController_1.getStorageStatistics);
// Audit trail
router.get('/records/:recordId/audit', digitalStorageController_1.getRecordAuditTrail);
exports.default = router;

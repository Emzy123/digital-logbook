"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const establishmentController_1 = require("../controllers/establishmentController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const auditMiddleware_1 = require("../middleware/auditMiddleware");
const User_1 = require("../models/User");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authenticate);
// Everyone authenticated can view establishments
router.get('/', establishmentController_1.getEstablishments);
// Only admins can create new ones
router.use((0, authMiddleware_1.authorize)([User_1.UserRole.ITF_ADMIN, User_1.UserRole.COORDINATOR, User_1.UserRole.SYSTEM_ADMIN]));
router.post('/', (0, auditMiddleware_1.auditAction)('CREATE_ESTABLISHMENT'), establishmentController_1.createEstablishment);
exports.default = router;

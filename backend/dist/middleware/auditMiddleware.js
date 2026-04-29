"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditAction = void 0;
const AuditLog_1 = require("../models/AuditLog");
const auditAction = (actionName) => {
    return async (req, res, next) => {
        try {
            const audit = new AuditLog_1.AuditLog({
                user_id: req.user?.userId,
                action: actionName,
                target_resource: req.originalUrl,
                ip_address: req.ip,
                snapshot: { body: req.body, query: req.query }
            });
            await audit.save();
        }
        catch (e) {
            console.error('Audit Log failed', e);
        }
        next();
    };
};
exports.auditAction = auditAction;

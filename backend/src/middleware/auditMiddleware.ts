import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../models/AuditLog';

export const auditAction = (actionName: string) => {
    return async (req: any, res: Response, next: NextFunction) => {
        try {
            const audit = new AuditLog({
                user_id: req.user?.userId,
                action: actionName,
                target_resource: req.originalUrl,
                ip_address: req.ip,
                snapshot: { body: req.body, query: req.query }
            });
            await audit.save();
        } catch(e) {
            console.error('Audit Log failed', e);
        }
        next();
    };
};

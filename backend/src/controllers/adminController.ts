import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { User, UserRole } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { StudentProfile } from '../models/StudentProfile';
import { SupervisorAssignment } from '../models/SupervisorAssignment';
import bcrypt from 'bcrypt';

export const createSupervisor = async (req: AuthRequest, res: Response) => {
    try {
        const { first_name, last_name, email, phone, password, role, establishment_id } = req.body;

        if (!first_name || !last_name || !email || !password || !role) {
            return res.status(400).json({ message: 'first_name, last_name, email, password, and role are required' });
        }

        const validRoles = [UserRole.INDUSTRY_SUPERVISOR, UserRole.SCHOOL_SUPERVISOR];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: 'Role must be industry_supervisor or school_supervisor' });
        }

        // Industry supervisors must be tied to an establishment
        if (role === UserRole.INDUSTRY_SUPERVISOR && !establishment_id) {
            return res.status(400).json({ message: 'An establishment must be selected for Industry Supervisors' });
        }

        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(409).json({ message: 'A user with this email already exists' });
        }

        const password_hash = await bcrypt.hash(password, 12);

        const user = await User.create({
            first_name,
            last_name,
            email: email.toLowerCase(),
            phone: phone || undefined,
            password_hash,
            role,
            is_active: true,
            created_by: req.user?.userId,
            establishment_id: role === UserRole.INDUSTRY_SUPERVISOR ? establishment_id : undefined,
        });

        const { password_hash: _, ...safe } = user.toObject();
        res.status(201).json({ message: 'Supervisor created successfully', user: safe });
    } catch(err: any) {
        res.status(500).json({ message: 'Error creating supervisor', error: err.message });
    }
};

export const getAllUsers = async (req: AuthRequest, res: Response) => {
    try {
        const users = await User.find().select('-password_hash').sort({ createdAt: -1 });
        res.status(200).json(users);
    } catch(err) {
        res.status(500).json({ message: 'Error retrieving users' });
    }
};

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
    try {
        const logs = await AuditLog.find().populate('user_id', 'email role').sort({ createdAt: -1 }).limit(100);
        res.status(200).json(logs);
    } catch(err) {
        res.status(500).json({ message: 'Error retrieving audit logs' });
    }
};

export const bulkImportUsers = async (req: AuthRequest, res: Response) => {
    try {
        const usersToCreate = req.body.users;
        if (!Array.isArray(usersToCreate)) return res.status(400).json({ message: 'Invalid payload' });

        const created = await User.insertMany(usersToCreate, { ordered: false });
        res.status(201).json({ message: `${created.length} users imported successfully.` });
    } catch(err: any) {
        res.status(500).json({ message: 'Error during bulk import', error: err.message });
    }
};

export const getSupervisors = async (req: AuthRequest, res: Response) => {
    try {
        const supervisors = await User.find({
            role: { $in: [UserRole.INDUSTRY_SUPERVISOR, UserRole.SCHOOL_SUPERVISOR] },
            is_active: true
        }).select('first_name last_name email role establishment_id');
        res.status(200).json(supervisors);
    } catch(err) {
        res.status(500).json({ message: 'Error retrieving supervisors' });
    }
};

export const getStudents = async (req: AuthRequest, res: Response) => {
    try {
        const students = await StudentProfile.find()
            .populate('user_id', 'first_name last_name email')
            .populate('establishment_id', 'name city')
            .sort({ createdAt: -1 });

        const assignments = await SupervisorAssignment.find({ is_active: true });

        const payload = students.map(st => {
            const assignment = assignments.find(a => a.student_id.toString() === st._id.toString());
            return {
                ...st.toObject(),
                assignment: assignment || null
            };
        });

        res.status(200).json(payload);
    } catch(err) {
        res.status(500).json({ message: 'Error retrieving students' });
    }
};

export const assignSupervisor = async (req: AuthRequest, res: Response) => {
    try {
        const { studentProfileId, industrySupervisorId, schoolSupervisorId } = req.body;

        if (!studentProfileId) return res.status(400).json({ message: 'studentProfileId is required' });

        const updateFields: any = {};
        if (industrySupervisorId) updateFields.industry_supervisor_id = industrySupervisorId;
        if (schoolSupervisorId) updateFields.school_supervisor_id = schoolSupervisorId;

        const assignment = await SupervisorAssignment.findOneAndUpdate(
            { student_id: studentProfileId, is_active: true },
            { $set: updateFields },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.status(200).json({ message: 'Assignment updated successfully', assignment });
    } catch(err: any) {
        res.status(500).json({ message: 'Error assigning supervisor', error: err.message });
    }
};

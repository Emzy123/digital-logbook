"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignSupervisor = exports.getStudents = exports.getSupervisors = exports.bulkImportUsers = exports.getAuditLogs = exports.getAllUsers = exports.createSupervisor = void 0;
const User_1 = require("../models/User");
const AuditLog_1 = require("../models/AuditLog");
const StudentProfile_1 = require("../models/StudentProfile");
const SupervisorAssignment_1 = require("../models/SupervisorAssignment");
const bcrypt_1 = __importDefault(require("bcrypt"));
const createSupervisor = async (req, res) => {
    try {
        const { first_name, last_name, email, phone, password, role, establishment_id } = req.body;
        if (!first_name || !last_name || !email || !password || !role) {
            return res.status(400).json({ message: 'first_name, last_name, email, password, and role are required' });
        }
        const validRoles = [User_1.UserRole.INDUSTRY_SUPERVISOR, User_1.UserRole.SCHOOL_SUPERVISOR];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: 'Role must be industry_supervisor or school_supervisor' });
        }
        // Industry supervisors must be tied to an establishment
        if (role === User_1.UserRole.INDUSTRY_SUPERVISOR && !establishment_id) {
            return res.status(400).json({ message: 'An establishment must be selected for Industry Supervisors' });
        }
        const existing = await User_1.User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(409).json({ message: 'A user with this email already exists' });
        }
        const password_hash = await bcrypt_1.default.hash(password, 12);
        const user = await User_1.User.create({
            first_name,
            last_name,
            email: email.toLowerCase(),
            phone: phone || undefined,
            password_hash,
            role,
            is_active: true,
            created_by: req.user?.userId,
            establishment_id: role === User_1.UserRole.INDUSTRY_SUPERVISOR ? establishment_id : undefined,
        });
        const { password_hash: _, ...safe } = user.toObject();
        res.status(201).json({ message: 'Supervisor created successfully', user: safe });
    }
    catch (err) {
        res.status(500).json({ message: 'Error creating supervisor', error: err.message });
    }
};
exports.createSupervisor = createSupervisor;
const getAllUsers = async (req, res) => {
    try {
        const users = await User_1.User.find().select('-password_hash').sort({ createdAt: -1 });
        res.status(200).json(users);
    }
    catch (err) {
        res.status(500).json({ message: 'Error retrieving users' });
    }
};
exports.getAllUsers = getAllUsers;
const getAuditLogs = async (req, res) => {
    try {
        const logs = await AuditLog_1.AuditLog.find().populate('user_id', 'email role').sort({ createdAt: -1 }).limit(100);
        res.status(200).json(logs);
    }
    catch (err) {
        res.status(500).json({ message: 'Error retrieving audit logs' });
    }
};
exports.getAuditLogs = getAuditLogs;
const bulkImportUsers = async (req, res) => {
    try {
        const usersToCreate = req.body.users;
        if (!Array.isArray(usersToCreate))
            return res.status(400).json({ message: 'Invalid payload' });
        const created = await User_1.User.insertMany(usersToCreate, { ordered: false });
        res.status(201).json({ message: `${created.length} users imported successfully.` });
    }
    catch (err) {
        res.status(500).json({ message: 'Error during bulk import', error: err.message });
    }
};
exports.bulkImportUsers = bulkImportUsers;
const getSupervisors = async (req, res) => {
    try {
        const supervisors = await User_1.User.find({
            role: { $in: [User_1.UserRole.INDUSTRY_SUPERVISOR, User_1.UserRole.SCHOOL_SUPERVISOR] },
            is_active: true
        }).select('first_name last_name email role establishment_id');
        res.status(200).json(supervisors);
    }
    catch (err) {
        res.status(500).json({ message: 'Error retrieving supervisors' });
    }
};
exports.getSupervisors = getSupervisors;
const getStudents = async (req, res) => {
    try {
        const students = await StudentProfile_1.StudentProfile.find()
            .populate('user_id', 'first_name last_name email')
            .populate('establishment_id', 'name city')
            .sort({ createdAt: -1 });
        const assignments = await SupervisorAssignment_1.SupervisorAssignment.find({ is_active: true });
        const payload = students.map(st => {
            const assignment = assignments.find(a => a.student_id.toString() === st._id.toString());
            return {
                ...st.toObject(),
                assignment: assignment || null
            };
        });
        res.status(200).json(payload);
    }
    catch (err) {
        res.status(500).json({ message: 'Error retrieving students' });
    }
};
exports.getStudents = getStudents;
const assignSupervisor = async (req, res) => {
    try {
        const { studentProfileId, industrySupervisorId, schoolSupervisorId } = req.body;
        if (!studentProfileId)
            return res.status(400).json({ message: 'studentProfileId is required' });
        const updateFields = {};
        if (industrySupervisorId)
            updateFields.industry_supervisor_id = industrySupervisorId;
        if (schoolSupervisorId)
            updateFields.school_supervisor_id = schoolSupervisorId;
        const assignment = await SupervisorAssignment_1.SupervisorAssignment.findOneAndUpdate({ student_id: studentProfileId, is_active: true }, { $set: updateFields }, { new: true, upsert: true, setDefaultsOnInsert: true });
        res.status(200).json({ message: 'Assignment updated successfully', assignment });
    }
    catch (err) {
        res.status(500).json({ message: 'Error assigning supervisor', error: err.message });
    }
};
exports.assignSupervisor = assignSupervisor;

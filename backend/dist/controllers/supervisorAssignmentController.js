"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableSupervisors = exports.getUnassignedStudents = exports.updateSupervisorAssignment = exports.createSupervisorAssignment = exports.getSupervisorAssignments = void 0;
const SupervisorAssignment_1 = require("../models/SupervisorAssignment");
const StudentProfile_1 = require("../models/StudentProfile");
const User_1 = require("../models/User");
const Notification_1 = require("../models/Notification");
const getSupervisorAssignments = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        const { status, page = 1, limit = 10 } = req.query;
        const query = {};
        if (status) {
            query.is_active = status === 'active';
        }
        // Students can only see their own assignments
        if (userRole === User_1.UserRole.STUDENT) {
            const studentProfile = await StudentProfile_1.StudentProfile.findOne({ user_id: userId });
            if (!studentProfile) {
                return res.status(404).json({ message: 'Student profile not found' });
            }
            query.student_id = studentProfile._id;
        }
        // Supervisors can only see their assigned students
        if (userRole === User_1.UserRole.INDUSTRY_SUPERVISOR || userRole === User_1.UserRole.SCHOOL_SUPERVISOR) {
            query[userRole === User_1.UserRole.INDUSTRY_SUPERVISOR ? 'industry_supervisor_id' : 'school_supervisor_id'] = userId;
        }
        const skip = (Number(page) - 1) * Number(limit);
        const assignments = await SupervisorAssignment_1.SupervisorAssignment.find(query)
            .populate('student_id', 'matriculation_number')
            .populate('industry_supervisor_id', 'first_name last_name email')
            .populate('school_supervisor_id', 'first_name last_name email')
            .sort({ assignment_date: -1 })
            .skip(skip)
            .limit(Number(limit));
        const total = await SupervisorAssignment_1.SupervisorAssignment.countDocuments(query);
        res.status(200).json({
            assignments,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('getSupervisorAssignments error:', error);
        res.status(500).json({ message: 'Error retrieving supervisor assignments' });
    }
};
exports.getSupervisorAssignments = getSupervisorAssignments;
const createSupervisorAssignment = async (req, res) => {
    try {
        const { student_id, industry_supervisor_id, school_supervisor_id } = req.body;
        // Validate student
        const studentProfile = await StudentProfile_1.StudentProfile.findById(student_id);
        if (!studentProfile) {
            return res.status(404).json({ message: 'Student profile not found' });
        }
        // Validate supervisors
        if (industry_supervisor_id) {
            const industrySupervisor = await User_1.User.findById(industry_supervisor_id);
            if (!industrySupervisor || industrySupervisor.role !== User_1.UserRole.INDUSTRY_SUPERVISOR) {
                return res.status(400).json({ message: 'Invalid industry supervisor' });
            }
        }
        if (school_supervisor_id) {
            const schoolSupervisor = await User_1.User.findById(school_supervisor_id);
            if (!schoolSupervisor || schoolSupervisor.role !== User_1.UserRole.SCHOOL_SUPERVISOR) {
                return res.status(400).json({ message: 'Invalid school supervisor' });
            }
        }
        // Check if assignment already exists
        const existingAssignment = await SupervisorAssignment_1.SupervisorAssignment.findOne({
            student_id,
            is_active: true
        });
        if (existingAssignment) {
            return res.status(400).json({ message: 'Student already has an active assignment' });
        }
        // Create new assignment
        const assignment = await SupervisorAssignment_1.SupervisorAssignment.create({
            student_id,
            industry_supervisor_id,
            school_supervisor_id,
            assignment_date: new Date(),
            is_active: true
        });
        // Populate assignment details
        const populatedAssignment = await SupervisorAssignment_1.SupervisorAssignment.findById(assignment._id)
            .populate('student_id', 'matriculation_number user_id')
            .populate('industry_supervisor_id', 'first_name last_name email')
            .populate('school_supervisor_id', 'first_name last_name email');
        // Create notifications for supervisors
        if (industry_supervisor_id) {
            await Notification_1.Notification.create({
                user_id: industry_supervisor_id,
                title: 'New Student Assignment',
                message: `You have been assigned as industry supervisor for ${studentProfile.matriculation_number}`,
                type: 'supervisor_assignment',
                related_id: assignment._id
            });
        }
        if (school_supervisor_id) {
            await Notification_1.Notification.create({
                user_id: school_supervisor_id,
                title: 'New Student Assignment',
                message: `You have been assigned as school supervisor for ${studentProfile.matriculation_number}`,
                type: 'supervisor_assignment',
                related_id: assignment._id
            });
        }
        // Create notification for student
        await Notification_1.Notification.create({
            user_id: studentProfile.user_id,
            title: 'Supervisor Assignment',
            message: 'Your supervisors have been assigned. You can now start logging your activities.',
            type: 'supervisor_assignment',
            related_id: assignment._id
        });
        res.status(201).json({
            message: 'Supervisor assignment created successfully',
            assignment: populatedAssignment
        });
    }
    catch (error) {
        console.error('createSupervisorAssignment error:', error);
        res.status(500).json({ message: 'Error creating supervisor assignment' });
    }
};
exports.createSupervisorAssignment = createSupervisorAssignment;
const updateSupervisorAssignment = async (req, res) => {
    try {
        const { id } = req.params;
        const { industry_supervisor_id, school_supervisor_id, is_active } = req.body;
        const assignment = await SupervisorAssignment_1.SupervisorAssignment.findById(id);
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }
        // Validate new supervisors if provided
        if (industry_supervisor_id) {
            const industrySupervisor = await User_1.User.findById(industry_supervisor_id);
            if (!industrySupervisor || industrySupervisor.role !== User_1.UserRole.INDUSTRY_SUPERVISOR) {
                return res.status(400).json({ message: 'Invalid industry supervisor' });
            }
        }
        if (school_supervisor_id) {
            const schoolSupervisor = await User_1.User.findById(school_supervisor_id);
            if (!schoolSupervisor || schoolSupervisor.role !== User_1.UserRole.SCHOOL_SUPERVISOR) {
                return res.status(400).json({ message: 'Invalid school supervisor' });
            }
        }
        // Update assignment
        if (industry_supervisor_id)
            assignment.industry_supervisor_id = industry_supervisor_id;
        if (school_supervisor_id)
            assignment.school_supervisor_id = school_supervisor_id;
        if (typeof is_active === 'boolean')
            assignment.is_active = is_active;
        await assignment.save();
        // Populate updated assignment
        const updatedAssignment = await SupervisorAssignment_1.SupervisorAssignment.findById(id)
            .populate('student_id', 'matriculation_number user_id')
            .populate('industry_supervisor_id', 'first_name last_name email')
            .populate('school_supervisor_id', 'first_name last_name email');
        res.status(200).json({
            message: 'Assignment updated successfully',
            assignment: updatedAssignment
        });
    }
    catch (error) {
        console.error('updateSupervisorAssignment error:', error);
        res.status(500).json({ message: 'Error updating assignment' });
    }
};
exports.updateSupervisorAssignment = updateSupervisorAssignment;
const getUnassignedStudents = async (req, res) => {
    try {
        // Get students with profiles but no active supervisor assignment
        const studentsWithAssignments = await SupervisorAssignment_1.SupervisorAssignment.find({ is_active: true })
            .distinct('student_id');
        const unassignedStudents = await StudentProfile_1.StudentProfile.find({
            _id: { $nin: studentsWithAssignments },
            establishment_id: { $exists: true, $ne: null } // Only students with approved placements
        })
            .populate('user_id', 'first_name last_name email')
            .populate('establishment_id', 'name')
            .sort({ createdAt: -1 });
        res.status(200).json(unassignedStudents);
    }
    catch (error) {
        console.error('getUnassignedStudents error:', error);
        res.status(500).json({ message: 'Error retrieving unassigned students' });
    }
};
exports.getUnassignedStudents = getUnassignedStudents;
const getAvailableSupervisors = async (req, res) => {
    try {
        const { supervisor_type } = req.query;
        let roleFilter;
        if (supervisor_type === 'industry') {
            roleFilter = User_1.UserRole.INDUSTRY_SUPERVISOR;
        }
        else if (supervisor_type === 'school') {
            roleFilter = User_1.UserRole.SCHOOL_SUPERVISOR;
        }
        else {
            return res.status(400).json({ message: 'Invalid supervisor type' });
        }
        const supervisors = await User_1.User.find({
            role: roleFilter,
            is_active: true
        })
            .select('first_name last_name email')
            .sort({ first_name: 1, last_name: 1 });
        res.status(200).json(supervisors);
    }
    catch (error) {
        console.error('getAvailableSupervisors error:', error);
        res.status(500).json({ message: 'Error retrieving supervisors' });
    }
};
exports.getAvailableSupervisors = getAvailableSupervisors;

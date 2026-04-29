"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommentThreads = exports.deleteComment = exports.editComment = exports.getComments = exports.addComment = void 0;
const SupervisorComment_1 = require("../models/SupervisorComment");
const LogEntry_1 = require("../models/LogEntry");
const StudentProfile_1 = require("../models/StudentProfile");
const User_1 = require("../models/User");
const Notification_1 = require("../models/Notification");
const AuditLog_1 = require("../models/AuditLog");
const mongoose_1 = require("mongoose");
const createAuditLog = async (userId, action, targetResource, targetId, snapshot, ipAddress) => {
    try {
        await AuditLog_1.AuditLog.create({
            user_id: new mongoose_1.Types.ObjectId(userId),
            action,
            target_resource: targetResource,
            target_id: targetId,
            snapshot,
            ip_address: ipAddress
        });
    }
    catch (error) {
        console.error('Error creating audit log:', error);
    }
};
const notifyMentionedUsers = async (commentId, content, mentions, authorId) => {
    try {
        for (const userId of mentions) {
            await Notification_1.Notification.create({
                user_id: userId,
                type: Notification_1.NotificationType.FEEDBACK,
                title: 'You were mentioned in a comment',
                message: `You were mentioned in a log entry discussion`,
                metadata: { comment_id: commentId, author_id: authorId }
            });
        }
    }
    catch (error) {
        console.error('Error notifying mentioned users:', error);
    }
};
const notifyStudentOfComment = async (logEntryId, commentType, authorName) => {
    try {
        const logEntry = await LogEntry_1.LogEntry.findById(logEntryId).populate('student_id');
        if (!logEntry || !logEntry.student_id)
            return;
        const studentProfile = await StudentProfile_1.StudentProfile.findById(logEntry.student_id);
        if (!studentProfile)
            return;
        let title, message;
        switch (commentType) {
            case SupervisorComment_1.CommentType.SUPERVISOR_REVIEW:
                title = 'Supervisor Review Comment';
                message = `${authorName} has reviewed your log entry and left a comment`;
                break;
            case SupervisorComment_1.CommentType.SCHOOL_SUPERVISOR_NOTE:
                title = 'School Supervisor Note';
                message = `School supervisor ${authorName} has added a note to your log entry`;
                break;
            case SupervisorComment_1.CommentType.COORDINATOR_NOTE:
                title = 'Coordinator Note';
                message = `Coordinator ${authorName} has added a note to your log entry`;
                break;
            default:
                return;
        }
        await Notification_1.Notification.create({
            user_id: studentProfile.user_id,
            type: Notification_1.NotificationType.FEEDBACK,
            title,
            message,
            metadata: { log_entry_id: logEntryId, comment_type: commentType }
        });
    }
    catch (error) {
        console.error('Error notifying student:', error);
    }
};
const addComment = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const { log_entry_id, content, comment_type, parent_comment_id, is_internal, mentions } = req.body;
        const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
        if (!log_entry_id || !content || !comment_type) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        // Verify log entry exists and user has access
        const logEntry = await LogEntry_1.LogEntry.findById(log_entry_id);
        if (!logEntry) {
            return res.status(404).json({ message: 'Log entry not found' });
        }
        // Parse mentions if sent as string
        let parsedMentions = [];
        if (mentions) {
            if (typeof mentions === 'string') {
                try {
                    parsedMentions = JSON.parse(mentions).map((id) => new mongoose_1.Types.ObjectId(id));
                }
                catch (error) {
                    return res.status(400).json({ message: 'Invalid mentions format' });
                }
            }
            else if (Array.isArray(mentions)) {
                parsedMentions = mentions.map(id => new mongoose_1.Types.ObjectId(id));
            }
        }
        // Create comment
        const comment = new SupervisorComment_1.SupervisorComment({
            log_entry_id: new mongoose_1.Types.ObjectId(log_entry_id),
            author_id: new mongoose_1.Types.ObjectId(req.user.userId),
            author_role: req.user.role,
            comment_type,
            content: content.trim(),
            parent_comment_id: parent_comment_id ? new mongoose_1.Types.ObjectId(parent_comment_id) : undefined,
            is_threaded: !!parent_comment_id,
            is_internal: is_internal || false,
            mentions: parsedMentions,
            attachments: []
        });
        await comment.save();
        // Create audit log
        await createAuditLog(req.user.userId, 'ADD_COMMENT', 'SupervisorComment', comment._id.toString(), {
            log_entry_id,
            comment_type,
            is_internal
        }, ipAddress);
        // Notify mentioned users
        if (parsedMentions.length > 0) {
            await notifyMentionedUsers(comment._id.toString(), content, parsedMentions, req.user.userId);
        }
        // Notify student if not internal comment
        if (!is_internal && comment_type !== SupervisorComment_1.CommentType.STUDENT_RESPONSE) {
            // Get user details for name
            const user = await User_1.User.findById(req.user.userId);
            const supervisorName = user ? `${user.first_name} ${user.last_name}` : 'Supervisor';
            await notifyStudentOfComment(log_entry_id, comment_type, supervisorName);
        }
        // Populate and return comment
        const populatedComment = await SupervisorComment_1.SupervisorComment.findById(comment._id)
            .populate('author_id', 'first_name last_name email')
            .populate('mentions', 'first_name last_name email');
        res.status(201).json(populatedComment);
    }
    catch (error) {
        console.error('addComment error:', error);
        res.status(500).json({ message: 'Error adding comment' });
    }
};
exports.addComment = addComment;
const getComments = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const { log_entry_id } = req.params;
        const { include_internal = false } = req.query;
        // Verify log entry exists and user has access
        const logEntry = await LogEntry_1.LogEntry.findById(log_entry_id);
        if (!logEntry) {
            return res.status(404).json({ message: 'Log entry not found' });
        }
        // Build query
        const query = { log_entry_id: new mongoose_1.Types.ObjectId(log_entry_id) };
        // Only show internal comments to supervisors and coordinators
        if (include_internal !== 'true' || !['industry_supervisor', 'school_supervisor', 'coordinator', 'system_admin', 'itf_admin'].includes(req.user.role)) {
            query.is_internal = { $ne: true };
        }
        const comments = await SupervisorComment_1.SupervisorComment.find(query)
            .populate('author_id', 'first_name last_name email')
            .populate('parent_comment_id', 'content author_id')
            .populate('mentions', 'first_name last_name email')
            .sort({ created_at: 1 });
        res.status(200).json(comments);
    }
    catch (error) {
        console.error('getComments error:', error);
        res.status(500).json({ message: 'Error retrieving comments' });
    }
};
exports.getComments = getComments;
const editComment = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const { id } = req.params;
        const { content } = req.body;
        const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
        if (!content || content.trim() === '') {
            return res.status(400).json({ message: 'Content cannot be empty' });
        }
        const comment = await SupervisorComment_1.SupervisorComment.findById(id);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }
        // Check if user can edit this comment
        if (comment.author_id.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Can only edit your own comments' });
        }
        // Update comment
        comment.content = content.trim();
        comment.is_edited = true;
        comment.edited_at = new Date();
        comment.updated_at = new Date();
        await comment.save();
        // Create audit log
        await createAuditLog(req.user.userId, 'EDIT_COMMENT', 'SupervisorComment', comment._id.toString(), { original_content: comment.content }, ipAddress);
        const populatedComment = await SupervisorComment_1.SupervisorComment.findById(comment._id)
            .populate('author_id', 'first_name last_name email')
            .populate('mentions', 'first_name last_name email');
        res.status(200).json(populatedComment);
    }
    catch (error) {
        console.error('editComment error:', error);
        res.status(500).json({ message: 'Error editing comment' });
    }
};
exports.editComment = editComment;
const deleteComment = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const { id } = req.params;
        const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
        const comment = await SupervisorComment_1.SupervisorComment.findById(id);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }
        // Check if user can delete this comment
        if (comment.author_id.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Can only delete your own comments' });
        }
        // Check if comment has replies
        const replyCount = await SupervisorComment_1.SupervisorComment.countDocuments({ parent_comment_id: comment._id });
        if (replyCount > 0) {
            return res.status(400).json({ message: 'Cannot delete comment with replies' });
        }
        await SupervisorComment_1.SupervisorComment.findByIdAndDelete(id);
        // Create audit log
        await createAuditLog(req.user.userId, 'DELETE_COMMENT', 'SupervisorComment', id, { content: comment.content }, ipAddress);
        res.status(200).json({ message: 'Comment deleted successfully' });
    }
    catch (error) {
        console.error('deleteComment error:', error);
        res.status(500).json({ message: 'Error deleting comment' });
    }
};
exports.deleteComment = deleteComment;
const getCommentThreads = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const { log_entry_id } = req.params;
        // Get root comments (no parent)
        const rootComments = await SupervisorComment_1.SupervisorComment.find({
            log_entry_id: new mongoose_1.Types.ObjectId(log_entry_id),
            parent_comment_id: { $exists: false }
        })
            .populate('author_id', 'first_name last_name email')
            .sort({ created_at: 1 });
        // Get all replies for each root comment
        const threads = await Promise.all(rootComments.map(async (rootComment) => {
            const replies = await SupervisorComment_1.SupervisorComment.find({
                parent_comment_id: rootComment._id
            })
                .populate('author_id', 'first_name last_name email')
                .sort({ created_at: 1 });
            return {
                root_comment: rootComment,
                replies
            };
        }));
        res.status(200).json(threads);
    }
    catch (error) {
        console.error('getCommentThreads error:', error);
        res.status(500).json({ message: 'Error retrieving comment threads' });
    }
};
exports.getCommentThreads = getCommentThreads;

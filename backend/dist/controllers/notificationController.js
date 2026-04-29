"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllAsRead = exports.markAsRead = exports.getNotifications = void 0;
const Notification_1 = require("../models/Notification");
const getNotifications = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const notifications = await Notification_1.Notification.find({ user_id: userId })
            .sort({ createdAt: -1 })
            .limit(50);
        res.status(200).json(notifications);
    }
    catch (error) {
        console.error('getNotifications error:', error);
        res.status(500).json({ message: 'Error retrieving notifications' });
    }
};
exports.getNotifications = getNotifications;
const markAsRead = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { id } = req.params;
        const notification = await Notification_1.Notification.findOneAndUpdate({ _id: id, user_id: userId }, { $set: { is_read: true, read_at: new Date() } }, { new: true });
        if (!notification)
            return res.status(404).json({ message: 'Notification not found' });
        res.status(200).json(notification);
    }
    catch (error) {
        console.error('markAsRead error:', error);
        res.status(500).json({ message: 'Error updating notification' });
    }
};
exports.markAsRead = markAsRead;
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user?.userId;
        await Notification_1.Notification.updateMany({ user_id: userId, is_read: false }, { $set: { is_read: true, read_at: new Date() } });
        res.status(200).json({ message: 'All notifications marked as read' });
    }
    catch (error) {
        console.error('markAllAsRead error:', error);
        res.status(500).json({ message: 'Error updating notifications' });
    }
};
exports.markAllAsRead = markAllAsRead;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadProfileDoc = exports.updateProfile = exports.getProfile = void 0;
const StudentProfile_1 = require("../models/StudentProfile");
const getProfile = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const profile = await StudentProfile_1.StudentProfile.findOne({ user_id: userId })
            .populate('user_id', 'email first_name last_name phone avatar_url');
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }
        res.status(200).json(profile);
    }
    catch (error) {
        console.error('getProfile error:', error);
        res.status(500).json({ message: 'Server error retrieving profile' });
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const updateData = req.body;
        const profile = await StudentProfile_1.StudentProfile.findOneAndUpdate({ user_id: userId }, { $set: updateData }, { new: true, upsert: true, setDefaultsOnInsert: true });
        res.status(200).json(profile);
    }
    catch (error) {
        console.error('updateProfile error:', error);
        res.status(500).json({ message: 'Server error updating profile' });
    }
};
exports.updateProfile = updateProfile;
const uploadProfileDoc = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const files = req.files;
        const updates = {};
        if (files?.placement_letter?.[0]) {
            updates.placement_letter_url = `/uploads/${files.placement_letter[0].filename}`;
        }
        if (files?.passport_photo?.[0]) {
            updates.passport_photo_url = `/uploads/${files.passport_photo[0].filename}`;
        }
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'No files were uploaded' });
        }
        const profile = await StudentProfile_1.StudentProfile.findOneAndUpdate({ user_id: userId }, { $set: updates }, { new: true, upsert: true });
        res.status(200).json({ message: 'Files uploaded successfully', profile });
    }
    catch (error) {
        console.error('uploadProfileDoc error:', error);
        res.status(500).json({ message: 'Server error uploading document' });
    }
};
exports.uploadProfileDoc = uploadProfileDoc;

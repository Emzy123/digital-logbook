"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDefaultUsers = void 0;
const User_1 = require("../models/User");
const bcrypt_1 = __importDefault(require("bcrypt"));
const seedDefaultUsers = async () => {
    try {
        const adminExists = await User_1.User.findOne({ email: 'admin@siwes.local' });
        if (!adminExists) {
            const password_hash = await bcrypt_1.default.hash('admin123', 12);
            await User_1.User.create({
                email: 'admin@siwes.local',
                password_hash,
                role: User_1.UserRole.SYSTEM_ADMIN,
                first_name: 'System',
                last_name: 'Admin',
                is_active: true,
            });
            console.log('Seeded default admin (admin@siwes.local / admin123)');
        }
        const studentExists = await User_1.User.findOne({ email: 'student@siwes.local' });
        if (!studentExists) {
            const password_hash = await bcrypt_1.default.hash('student123', 12);
            await User_1.User.create({
                email: 'student@siwes.local',
                password_hash,
                role: User_1.UserRole.STUDENT,
                first_name: 'Demo',
                last_name: 'Student',
                is_active: true,
            });
            console.log('Seeded default student (student@siwes.local / student123)');
        }
        const supervisorExists = await User_1.User.findOne({ email: 'supervisor@siwes.local' });
        if (!supervisorExists) {
            const password_hash = await bcrypt_1.default.hash('supervisor123', 12);
            await User_1.User.create({
                email: 'supervisor@siwes.local',
                password_hash,
                role: User_1.UserRole.INDUSTRY_SUPERVISOR,
                first_name: 'Demo',
                last_name: 'Supervisor',
                is_active: true,
            });
            console.log('Seeded default supervisor (supervisor@siwes.local / supervisor123)');
        }
    }
    catch (error) {
        console.error('Error seeding default users:', error);
    }
};
exports.seedDefaultUsers = seedDefaultUsers;

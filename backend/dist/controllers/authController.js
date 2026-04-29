"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only';
const JWT_EXPIRES_IN = '1h';
const register = async (req, res) => {
    try {
        const { email, password, first_name, last_name, role } = req.body;
        const existingUser = await User_1.User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already in use' });
        }
        const salt = await bcrypt_1.default.genSalt(12);
        const password_hash = await bcrypt_1.default.hash(password, salt);
        const newUser = new User_1.User({
            email: email.toLowerCase(),
            password_hash,
            first_name,
            last_name,
            role: role || User_1.UserRole.STUDENT,
            is_active: true
        });
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully', userId: newUser._id });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User_1.User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        if (!user.is_active) {
            return res.status(403).json({ message: 'Account is disabled' });
        }
        if (user.locked_until && user.locked_until > new Date()) {
            return res.status(403).json({ message: 'Account is temporarily locked due to too many failed attempts' });
        }
        const isMatch = await bcrypt_1.default.compare(password, user.password_hash);
        if (!isMatch) {
            user.failed_login_attempts += 1;
            if (user.failed_login_attempts >= 5) {
                user.locked_until = new Date(Date.now() + 15 * 60 * 1000); // lock for 15 mins
            }
            await user.save();
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        // Reset login attempts
        user.failed_login_attempts = 0;
        user.locked_until = undefined;
        user.last_login = new Date();
        await user.save();
        const token = jsonwebtoken_1.default.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};
exports.login = login;

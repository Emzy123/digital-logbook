"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const studentRoutes_1 = __importDefault(require("./routes/studentRoutes"));
const logEntryRoutes_1 = __importDefault(require("./routes/logEntryRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const supervisorRoutes_1 = __importDefault(require("./routes/supervisorRoutes"));
const weeklySummaryRoutes_1 = __importDefault(require("./routes/weeklySummaryRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const analyticsRoutes_1 = __importDefault(require("./routes/analyticsRoutes"));
const establishmentRoutes_1 = __importDefault(require("./routes/establishmentRoutes"));
const companyRequestRoutes_1 = __importDefault(require("./routes/companyRequestRoutes"));
const supervisorAssignmentRoutes_1 = __importDefault(require("./routes/supervisorAssignmentRoutes"));
const supervisorCommentRoutes_1 = __importDefault(require("./routes/supervisorCommentRoutes"));
const industrySupervisorRoutes_1 = __importDefault(require("./routes/industrySupervisorRoutes"));
const schoolSupervisorRoutes_1 = __importDefault(require("./routes/schoolSupervisorRoutes"));
const coordinatorOversightRoutes_1 = __importDefault(require("./routes/coordinatorOversightRoutes"));
const assessmentRoutes_1 = __importDefault(require("./routes/assessmentRoutes"));
const itfOversightRoutes_1 = __importDefault(require("./routes/itfOversightRoutes"));
const digitalStorageRoutes_1 = __importDefault(require("./routes/digitalStorageRoutes"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
// Security Middlewares
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
const apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', apiLimiter);
// Cross-Origin Resource Policy for images
app.use(helmet_1.default.crossOriginResourcePolicy({ policy: "cross-origin" }));
// Parsers
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Logging
app.use((0, morgan_1.default)('dev'));
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/students', studentRoutes_1.default);
app.use('/api/students/logs', logEntryRoutes_1.default);
app.use('/api/notifications', notificationRoutes_1.default);
app.use('/api/supervisors', supervisorRoutes_1.default);
app.use('/api/weekly-summaries', weeklySummaryRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/analytics', analyticsRoutes_1.default);
app.use('/api/establishments', establishmentRoutes_1.default);
app.use('/api/company-requests', companyRequestRoutes_1.default);
app.use('/api/supervisor-assignments', supervisorAssignmentRoutes_1.default);
app.use('/api/supervisor-comments', supervisorCommentRoutes_1.default);
app.use('/api/industry-supervisor', industrySupervisorRoutes_1.default);
app.use('/api/school-supervisor', schoolSupervisorRoutes_1.default);
app.use('/api/coordinator-oversight', coordinatorOversightRoutes_1.default);
app.use('/api/assessments', assessmentRoutes_1.default);
app.use('/api/itf-oversight', itfOversightRoutes_1.default);
app.use('/api/digital-storage', digitalStorageRoutes_1.default);
// Static file serving for uploads
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../../uploads')));
// Health Check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});
exports.default = app;

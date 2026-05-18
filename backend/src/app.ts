import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes';
import studentRoutes from './routes/studentRoutes';
import logEntryRoutes from './routes/logEntryRoutes';
import notificationRoutes from './routes/notificationRoutes';
import supervisorRoutes from './routes/supervisorRoutes';
import weeklySummaryRoutes from './routes/weeklySummaryRoutes';
import adminRoutes from './routes/adminRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import establishmentRoutes from './routes/establishmentRoutes';
import companyRequestRoutes from './routes/companyRequestRoutes';
import supervisorAssignmentRoutes from './routes/supervisorAssignmentRoutes';
import supervisorCommentRoutes from './routes/supervisorCommentRoutes';
import industrySupervisorRoutes from './routes/industrySupervisorRoutes';
import schoolSupervisorRoutes from './routes/schoolSupervisorRoutes';
import coordinatorOversightRoutes from './routes/coordinatorOversightRoutes';
import assessmentRoutes from './routes/assessmentRoutes';
import itfOversightRoutes from './routes/itfOversightRoutes';
import digitalStorageRoutes from './routes/digitalStorageRoutes';
import searchRoutes from './routes/searchRoutes';
import reportRoutes from './routes/reportRoutes';
import exportRoutes from './routes/exportRoutes';
import path from 'path';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    const allowedOriginPattern = /^http:\/\/localhost:\d+$/;
    if (allowedOriginPattern.test(origin) || origin === process.env.FRONTEND_URL) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', apiLimiter);

// Cross-Origin Resource Policy for images
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));

// Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/students/logs', logEntryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/supervisors', supervisorRoutes);
app.use('/api/weekly-summaries', weeklySummaryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/establishments', establishmentRoutes);
app.use('/api/company-requests', companyRequestRoutes);
app.use('/api/supervisor-assignments', supervisorAssignmentRoutes);
app.use('/api/supervisor-comments', supervisorCommentRoutes);
app.use('/api/industry-supervisor', industrySupervisorRoutes);
app.use('/api/school-supervisor', schoolSupervisorRoutes);
app.use('/api/coordinator-oversight', coordinatorOversightRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/itf-oversight', itfOversightRoutes);
app.use('/api/digital-storage', digitalStorageRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/export', exportRoutes);

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

export default app;

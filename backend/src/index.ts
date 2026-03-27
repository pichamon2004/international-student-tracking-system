import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.routes';
import studentRoutes from './routes/student.routes';
import passportRoutes from './routes/passport.routes';
import visaRoutes from './routes/visa.routes';
import documentRoutes from './routes/document.routes';
import templateRoutes from './routes/template.routes';
import requestTypeRoutes from './routes/requestType.routes';
import requestRoutes from './routes/request.routes';
import userRoutes from './routes/user.routes';
import healthInsuranceRoutes from './routes/healthInsurance.routes';
import dependentRoutes from './routes/dependent.routes';
import notificationRoutes from './routes/notification.routes';
import generatedDocRoutes, { requestDocRouter } from './routes/generatedDoc.routes';
import visaRenewalRoutes, { studentVisaRenewalRouter } from './routes/visaRenewal.routes';
import auditLogRoutes from './routes/auditLog.routes';
import advisorRoutes from './routes/advisor.routes';
import emailTemplateRoutes from './routes/emailTemplate.routes';
import academicDocumentRoutes from './routes/academicDocument.routes';
import interserviceRoutes, { mockKkuEndpoint } from './routes/interservice.routes';
import studentEmailRoutes from './routes/studentEmail.routes';
import devRoutes from './routes/dev.routes';
import { errorHandler } from './middleware/errorHandler.middleware';
import { startScheduler } from './services/scheduler.service';

dotenv.config();

// ── Env validation ─────────────────────────────────────────────
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 4000;

// ── Security ──────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting
const globalLimiter = rateLimit({ windowMs: 60_000, max: 200, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 20, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many login attempts, please try again later' } });

app.use(globalLimiter);
app.use('/api/auth/login', authLimiter);

// ── General middleware ─────────────────────────────────────────
app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/advisors', advisorRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/students', passportRoutes);
app.use('/api/students', visaRoutes);
app.use('/api/students', documentRoutes);
app.use('/api/students', healthInsuranceRoutes);
app.use('/api/students', dependentRoutes);
app.use('/api/students', academicDocumentRoutes);
app.use('/api/students', studentVisaRenewalRouter);
app.use('/api/templates', templateRoutes);
app.use('/api/request-types', requestTypeRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/requests', requestDocRouter);
app.use('/api/notifications', notificationRoutes);
app.use('/api/generated-documents', generatedDocRoutes);
app.use('/api/visa-renewals', visaRenewalRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/email-templates', emailTemplateRoutes);
app.use('/api/students', interserviceRoutes);
app.use('/api/students', studentEmailRoutes);

// Mock KKU endpoint — dev only
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/mock/kku-interservice', mockKkuEndpoint);
}

// Dev management routes — protected by DEV_SECRET header (always mounted)
if (process.env.DEV_SECRET) {
  app.use('/api/dev', devRoutes);
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Global error handler (must be last) ───────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  startScheduler();
});

export default app;

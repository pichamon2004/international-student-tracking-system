import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

import authRoutes from './routes/auth.routes';
import studentRoutes from './routes/student.routes';
import passportRoutes from './routes/passport.routes';
import visaRoutes from './routes/visa.routes';
import documentRoutes from './routes/document.routes';
import templateRoutes from './routes/template.routes';
import requestTypeRoutes from './routes/requestType.routes';
import requestRoutes from './routes/request.routes';
import userRoutes from './routes/user.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/students', passportRoutes);
app.use('/api/students', visaRoutes);
app.use('/api/students', documentRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/request-types', requestTypeRoutes);
app.use('/api/requests', requestRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;

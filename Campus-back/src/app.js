import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { randomUUID } from 'node:crypto';
import authRoutes from './routes/auth.js';
import jobsRoutes from './routes/jobs.js';
import applicationsRoutes from './routes/applications.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes from './routes/upload.js';
import studentRoutes from './routes/student.js';
import companiesRoutes from './routes/companies.js';
import { env } from './config/env.js';
import { logError, logInfo, logWarn, serializeError } from './utils/logger.js';

const configuredFrontendOrigin = String(env.FRONTEND_URL || '').trim();

const allowedOrigins = [
  'http://localhost:5173',
  'https://campusrec-io.vercel.app',
  ...(configuredFrontendOrigin ? [configuredFrontendOrigin] : []),
  /^https:\/\/campusrec-io(?:-[a-z0-9-]+)?\.vercel\.app$/i,
  /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:5173$/,
  /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:5173$/,
  /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}:5173$/,
];

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.some((item) =>
      item instanceof RegExp ? item.test(origin) : item === origin
    );
    if (isAllowed) {
      callback(null, true);
      return;
    }

    logWarn('CORS blocked', { origin });
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

function createLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
  });
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    })
  );
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
  app.use(express.json({ limit: '1mb' }));

  if (env.DISABLE_RATE_LIMIT !== 'true') {
    app.use(
      '/api',
      createLimiter({
        windowMs: 15 * 60 * 1000,
        max: 600,
        message: 'Too many requests. Please try again later.',
      })
    );
    app.use(
      '/api/auth',
      createLimiter({
        windowMs: 15 * 60 * 1000,
        max: 40,
        message: 'Too many authentication attempts. Please try again later.',
      })
    );
    app.use(
      '/api/upload',
      createLimiter({
        windowMs: 15 * 60 * 1000,
        max: 60,
        message: 'Too many upload requests. Please try again later.',
      })
    );
  }

  app.use((req, res, next) => {
    const requestId = randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    const start = Date.now();
    logInfo('Request started', {
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
    });
    res.on('finish', () => {
      const ms = Date.now() - start;
      logInfo('Request completed', {
        requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs: ms,
      });
    });
    next();
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/jobs', jobsRoutes);
  app.use('/api/applications', applicationsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/student', studentRoutes);
  app.use('/api/companies', companiesRoutes);

  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  app.use((err, req, res, _next) => {
    logError('Unhandled server error', {
      requestId: req?.requestId,
      error: serializeError(err),
    });
    if (res.headersSent) return;
    res.status(500).json({ message: 'Server error' });
  });

  return app;
}

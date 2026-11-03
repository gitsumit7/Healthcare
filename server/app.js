import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import hospitalRoutes from './routes/hospitalRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import geoRoutes from './routes/geoRoutes.js';
import { notFound, errorHandler } from './middleware/error.js';
import { protect } from './middleware/auth.js';
import { streamEvents } from './utils/events.js';

const app = express();

// Defaults, loosened only as far as Google Identity Services (the "Continue with Google" button) needs.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ["'self'", 'https://accounts.google.com/gsi/client'],
        frameSrc: ["'self'", 'https://accounts.google.com/gsi/'],
        connectSrc: ["'self'", 'https://accounts.google.com/gsi/'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://accounts.google.com/gsi/style'],
        imgSrc: ["'self'", 'data:', 'https://*.googleusercontent.com'],
      },
    },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.set('trust proxy', 1); // correct client IPs for rate limiting behind the Vite proxy / hosting proxies
app.use(express.json({ limit: '100kb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/geo', geoRoutes);
app.get('/api/events', protect, streamEvents);
app.use('/api', notFound);

// In production, serve the built React app from the same origin.
if (process.env.NODE_ENV === 'production') {
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../client/dist');
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(errorHandler);

export default app;

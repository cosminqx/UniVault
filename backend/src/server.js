import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import professorRoutes from './routes/professorRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import { errorHandler } from './middleware/error.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowedOrigins = new Set([env.frontendUrl, ...env.frontendUrls]);

for (const origin of [...allowedOrigins]) {
  try {
    const frontend = new URL(origin);
    if (frontend.hostname === 'localhost') {
      allowedOrigins.add(`${frontend.protocol}//127.0.0.1:${frontend.port}`);
    } else if (frontend.hostname === '127.0.0.1') {
      allowedOrigins.add(`${frontend.protocol}//localhost:${frontend.port}`);
    }
  } catch {
    // Keep strict behavior for values that are not valid URLs.
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

app.use('/uploads', express.static(path.resolve(__dirname, './uploads')));

app.get('/api/health', (req, res) => {
  res.json({ message: 'UniVault API healthy' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/professor', professorRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/stats', statsRoutes);

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Backend running on port ${env.port}`);
});

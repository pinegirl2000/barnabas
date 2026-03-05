import express from 'express';
import cors from 'cors';
import path from 'path';
import { authRouter } from './routes/auth';
import { familyRouter } from './routes/families';
import { memberRouter } from './routes/members';
import { volunteerRouter } from './routes/volunteers';
import { districtRouter } from './routes/districts';
import { regionRouter } from './routes/regions';
import { zoneRouter } from './routes/zones';
import { pastorRouter } from './routes/pastors';
import { sessionRouter } from './routes/sessions';
import { assignmentRouter } from './routes/assignments';
import { dashboardRouter } from './routes/dashboard';
import { uploadRouter } from './routes/upload';

const app = express();

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.CLIENT_URL
    : 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/families', familyRouter);
app.use('/api/members', memberRouter);
app.use('/api/volunteers', volunteerRouter);
app.use('/api/districts', districtRouter);
app.use('/api/regions', regionRouter);
app.use('/api/zones', zoneRouter);
app.use('/api/pastors', pastorRouter);
app.use('/api/sessions', sessionRouter);
app.use('/api/assignments', assignmentRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/upload', uploadRouter);

// Static file serving for uploads
app.use('/uploads', express.static('uploads'));

// Production: serve React client
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

export default app;

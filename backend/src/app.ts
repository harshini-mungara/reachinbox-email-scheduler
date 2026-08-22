import express from 'express';
import cors from 'cors';
import campaignRoutes from './routes/campaignRoutes';
import emailRoutes from './routes/emailRoutes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Enable CORS for Next.js frontend calls
app.use(
  cors({
    origin: '*', // For local dev integration, or customize to specific client origin
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-user-email', 'x-user-name', 'x-user-avatar'],
  })
);

app.use(express.json());

// Routes
app.use('/api/campaigns', campaignRoutes);
app.use('/api/emails', emailRoutes);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Centralized error handler
app.use(errorHandler);

export default app;

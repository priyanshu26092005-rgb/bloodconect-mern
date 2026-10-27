import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.js';
import donorRoutes from './routes/donors.js';
import requestRoutes from './routes/requests.js';
import adminRoutes from './routes/admin.js';

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is missing. Copy .env.example to .env and configure it.');
const app = express();
const server = createServer(app);
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: '100kb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', app: 'BloodConnect API' }));
app.use('/api/auth', authRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/admin', adminRoutes);
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ message: 'Unexpected server error.' }); });

const io = new Server(server, { cors: { origin: allowedOrigin, methods: ['GET', 'POST'] } });
globalThis.io = io;
io.on('connection', socket => { socket.emit('connected', { message: 'Live updates connected.' }); });

const port = Number(process.env.PORT || 5000);
try {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bloodconnect');
  server.listen(port, () => console.log(`BloodConnect API running at http://localhost:${port}`));
} catch (error) {
  console.error('MongoDB connection failed. Check MONGODB_URI and make sure MongoDB is running.', error.message);
  process.exit(1);
}

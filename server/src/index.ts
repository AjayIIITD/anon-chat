import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import authRoutes from './routes/authRoutes';
import roomRoutes from './routes/roomRoutes';
import messageRoutes from './routes/messageRoutes';
import adminRoutes from './routes/adminRoutes';
import { initWebSocketServer } from './ws';
import { pool } from './db';

import bcrypt from 'bcryptjs';

dotenv.config();

// Auto-run DB schema migration and initial seed on startup
async function runAutoMigration() {
  try {
    const schemaPath = path.join(__dirname, 'db', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
      await pool.query(schemaSql);
      console.log('✅ Database schema migration applied successfully.');
    } else {
      console.warn('⚠️ schema.sql not found, skipping auto-migration.');
    }

    // Auto-seed default rooms and admin if database is newly created
    const roomsCountRes = await pool.query('SELECT COUNT(*)::int AS count FROM chat_rooms;');
    if (roomsCountRes.rows[0].count === 0) {
      console.log('🌱 Seeding initial chat rooms and admin account...');
      const defaultRooms = [
        { name: 'General', description: 'The open town square for spontaneous, friendly banter and everyday chat.' },
        { name: 'Programming', description: 'Deep dives into code, system architecture, tech stacks, and debugging war stories.' },
        { name: 'Photography', description: 'Shutter speeds, lenses, street photography, and visual composition.' },
        { name: 'Late Night Talks', description: 'Midnight reflections, twilight musings, and calm, unhurried conversations.' },
        { name: 'Study Room', description: 'Deep focus sprints, book insights, learning tips, and mutual accountability.' },
        { name: 'Gaming', description: 'Multiplayer squads, tactical strategies, indie masterpieces, and gaming lore.' },
        { name: 'Random', description: 'No filters, no fixed topics — shower thoughts, surreal ideas, and funny observations.' },
      ];
      for (const r of defaultRooms) {
        await pool.query(
          `INSERT INTO chat_rooms (name, description, is_active)
           VALUES ($1, $2, true)
           ON CONFLICT (name) DO NOTHING;`,
          [r.name, r.description]
        );
      }

      const adminEmail = 'admin@iiitd.ac.in';
      const adminPass = 'ajay@admin_20170';
      const adminHash = await bcrypt.hash(adminPass, 10);
      await pool.query(
        `INSERT INTO users (email, password_hash, anonymous_username, preferences, role)
         VALUES ($1, $2, 'ApexSentinel', '{"interests":["Architecture","Security"],"vibe":"mystic","topics":["System Oversight"]}'::jsonb, 'admin')
         ON CONFLICT (email) DO NOTHING;`,
        [adminEmail, adminHash]
      );
      console.log('✅ Initial rooms and admin account initialized successfully.');
    }
  } catch (err: any) {
    console.error('⚠️ Auto-migration warning (non-fatal):', err.message);
  }
}

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use(express.json());

// Initialize WebSocket server
initWebSocketServer(server);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/rooms', messageRoutes);
app.use('/api/admin', adminRoutes);

// Health & Status
app.get('/api/health', async (_req, res) => {
  try {
    const dbRes = await pool.query('SELECT NOW() AS current_time;');
    res.json({
      status: 'ok',
      service: 'anon-chat-backend',
      database: 'connected',
      timestamp: dbRes.rows[0].current_time,
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: err.message,
    });
  }
});

// Centralized error handling
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'An unexpected internal server error occurred.' });
});

// Run migration then start server
runAutoMigration().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 AnonChat Backend Server running on http://localhost:${PORT}`);
  });
});

export { app, server };

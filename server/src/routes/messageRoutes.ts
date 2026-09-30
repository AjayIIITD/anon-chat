import { Router, Response } from 'express';
import { pool } from '../db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/authMiddleware';
import { broadcastMessageToRoom } from '../ws';

const router = Router();

// Get messages for a room
router.get('/:roomId/messages', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'admin';

    // Verify membership or admin
    if (!isAdmin) {
      const memberCheck = await pool.query(
        'SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2;',
        [roomId, userId]
      );
      if (memberCheck.rows.length === 0) {
        res.status(403).json({ error: 'You must join this room to view and participate in conversations.' });
        return;
      }
    }

    const query = `
      SELECT 
        m.id,
        m.room_id,
        m.message,
        m.created_at,
        u.anonymous_username,
        (m.sender_id = $1) AS is_self
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.room_id = $2
      ORDER BY m.created_at ASC
      LIMIT 300;
    `;

    const result = await pool.query(query, [userId, roomId]);

    res.json({ messages: result.rows });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to retrieve messages.' });
  }
});

// Post a message to a room
router.post('/:roomId/messages', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const roomId = req.params.roomId as string;
    const { message } = req.body;
    const userId = req.user!.id;
    const anonymousUsername = req.user!.anonymous_username;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ error: 'Message cannot be empty.' });
      return;
    }

    if (message.length > 2000) {
      res.status(400).json({ error: 'Message cannot exceed 2000 characters.' });
      return;
    }

    const trimmedMessage = message.trim();

    // Verify room is active
    const roomCheck = await pool.query('SELECT id, is_active FROM chat_rooms WHERE id = $1;', [roomId]);
    if (roomCheck.rows.length === 0 || !roomCheck.rows[0].is_active) {
      res.status(404).json({ error: 'Room does not exist or is inactive.' });
      return;
    }

    // Auto-join user to room if not yet a member
    await pool.query(
      `INSERT INTO room_members (room_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (room_id, user_id) DO NOTHING;`,
      [roomId, userId]
    );

    // Insert message
    const insertRes = await pool.query(
      `INSERT INTO messages (room_id, sender_id, message)
       VALUES ($1, $2, $3)
       RETURNING id, room_id, message, created_at;`,
      [roomId, userId, trimmedMessage]
    );

    const savedMsg = insertRes.rows[0];

    const messagePayload = {
      id: savedMsg.id,
      room_id: savedMsg.room_id,
      message: savedMsg.message,
      created_at: savedMsg.created_at,
      anonymous_username: anonymousUsername,
      sender_id: userId, // used internally by WS to determine is_self on other sockets
    };

    // Broadcast in real-time via WebSocket
    broadcastMessageToRoom(roomId, messagePayload);

    res.status(201).json({
      message: {
        id: savedMsg.id,
        room_id: savedMsg.room_id,
        message: savedMsg.message,
        created_at: savedMsg.created_at,
        anonymous_username: anonymousUsername,
        is_self: true,
      },
    });
  } catch (error) {
    console.error('Error posting message:', error);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

export default router;

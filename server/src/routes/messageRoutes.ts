import { Router, Response } from 'express';
import { pool } from '../db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/authMiddleware';
import { broadcastMessageToRoom, broadcastReactionToRoom } from '../ws';

const router = Router();

// Get messages for a room (with reply previews and reactions)
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

    // Fetch messages with reply preview via LEFT JOIN
    const query = `
      SELECT 
        m.id,
        m.room_id,
        m.message,
        m.created_at,
        m.reply_to,
        u.anonymous_username,
        (m.sender_id = $1) AS is_self,
        rp.id AS reply_id,
        rp.message AS reply_message,
        ru.anonymous_username AS reply_username
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      LEFT JOIN messages rp ON rp.id = m.reply_to
      LEFT JOIN users ru ON ru.id = rp.sender_id
      WHERE m.room_id = $2
      ORDER BY m.created_at ASC
      LIMIT 300;
    `;

    const result = await pool.query(query, [userId, roomId]);

    // Fetch all reactions for these messages
    const messageIds = result.rows.map((r: any) => r.id);
    let reactionsMap: Record<string, { emoji: string; count: number; reacted_by_me: boolean }[]> = {};

    if (messageIds.length > 0) {
      const reactionsQuery = `
        SELECT 
          mr.message_id,
          mr.emoji,
          COUNT(*)::int AS count,
          bool_or(mr.user_id = $1) AS reacted_by_me
        FROM message_reactions mr
        WHERE mr.message_id = ANY($2)
        GROUP BY mr.message_id, mr.emoji
        ORDER BY mr.emoji;
      `;
      const reactionsRes = await pool.query(reactionsQuery, [userId, messageIds]);
      for (const row of reactionsRes.rows) {
        if (!reactionsMap[row.message_id]) {
          reactionsMap[row.message_id] = [];
        }
        reactionsMap[row.message_id].push({
          emoji: row.emoji,
          count: row.count,
          reacted_by_me: row.reacted_by_me,
        });
      }
    }

    const messages = result.rows.map((row: any) => ({
      id: row.id,
      room_id: row.room_id,
      message: row.message,
      created_at: row.created_at,
      anonymous_username: row.anonymous_username,
      is_self: row.is_self,
      reply_to: row.reply_to || undefined,
      reply_preview: row.reply_id
        ? {
            id: row.reply_id,
            message: row.reply_message,
            anonymous_username: row.reply_username,
          }
        : undefined,
      reactions: reactionsMap[row.id] || [],
    }));

    res.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to retrieve messages.' });
  }
});

// Post a message to a room (with optional reply_to)
router.post('/:roomId/messages', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const roomId = req.params.roomId as string;
    const { message, reply_to } = req.body;
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

    // Insert message with optional reply_to
    const insertRes = await pool.query(
      `INSERT INTO messages (room_id, sender_id, message, reply_to)
       VALUES ($1, $2, $3, $4)
       RETURNING id, room_id, message, reply_to, created_at;`,
      [roomId, userId, trimmedMessage, reply_to || null]
    );

    const savedMsg = insertRes.rows[0];

    // Fetch reply preview if reply_to exists
    let replyPreview = undefined;
    if (savedMsg.reply_to) {
      const replyRes = await pool.query(
        `SELECT m.id, m.message, u.anonymous_username
         FROM messages m JOIN users u ON u.id = m.sender_id
         WHERE m.id = $1;`,
        [savedMsg.reply_to]
      );
      if (replyRes.rows.length > 0) {
        replyPreview = {
          id: replyRes.rows[0].id,
          message: replyRes.rows[0].message,
          anonymous_username: replyRes.rows[0].anonymous_username,
        };
      }
    }

    const messagePayload = {
      id: savedMsg.id,
      room_id: savedMsg.room_id,
      message: savedMsg.message,
      created_at: savedMsg.created_at,
      anonymous_username: anonymousUsername,
      sender_id: userId,
      reply_to: savedMsg.reply_to || undefined,
      reply_preview: replyPreview,
      reactions: [],
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
        reply_to: savedMsg.reply_to || undefined,
        reply_preview: replyPreview,
        reactions: [],
      },
    });
  } catch (error) {
    console.error('Error posting message:', error);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

// Toggle reaction on a message (add if not exists, remove if already reacted)
router.post('/:roomId/messages/:messageId/react', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const roomId = req.params.roomId as string;
    const messageId = req.params.messageId as string;
    const { emoji } = req.body;
    const userId = req.user!.id;

    if (!emoji || typeof emoji !== 'string' || emoji.length > 10) {
      res.status(400).json({ error: 'Invalid emoji.' });
      return;
    }

    // Verify message belongs to this room
    const msgCheck = await pool.query(
      'SELECT id FROM messages WHERE id = $1 AND room_id = $2;',
      [messageId, roomId]
    );
    if (msgCheck.rows.length === 0) {
      res.status(404).json({ error: 'Message not found in this room.' });
      return;
    }

    // Check if user already reacted with this emoji
    const existingReaction = await pool.query(
      'SELECT id FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3;',
      [messageId, userId, emoji]
    );

    let action: 'added' | 'removed';

    if (existingReaction.rows.length > 0) {
      // Remove reaction (toggle off)
      await pool.query(
        'DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3;',
        [messageId, userId, emoji]
      );
      action = 'removed';
    } else {
      // Add reaction (toggle on)
      await pool.query(
        'INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3);',
        [messageId, userId, emoji]
      );
      action = 'added';
    }

    // Fetch updated reactions for this message
    const reactionsRes = await pool.query(
      `SELECT emoji, COUNT(*)::int AS count, bool_or(user_id = $1) AS reacted_by_me
       FROM message_reactions WHERE message_id = $2
       GROUP BY emoji ORDER BY emoji;`,
      [userId, messageId]
    );

    const reactions = reactionsRes.rows.map((r: any) => ({
      emoji: r.emoji,
      count: r.count,
      reacted_by_me: r.reacted_by_me,
    }));

    // Broadcast reaction update via WebSocket
    broadcastReactionToRoom(roomId, messageId, userId);

    res.json({ action, reactions });
  } catch (error) {
    console.error('Error toggling reaction:', error);
    res.status(500).json({ error: 'Failed to toggle reaction.' });
  }
});

export default router;

import { Router, Response } from 'express';
import { pool } from '../db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/authMiddleware';
import { getLivePresenceMap } from '../ws';

const router = Router();

// Get live presence map for all rooms
router.get('/live-presence', authenticateToken, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const liveMap = getLivePresenceMap();
    res.json({ livePresence: liveMap });
  } catch (error) {
    console.error('Error fetching live presence:', error);
    res.status(500).json({ error: 'Failed to fetch live presence.' });
  }
});

// List all active rooms with membership status and real-time live counts
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const query = `
      SELECT 
        r.id, 
        r.name, 
        r.description, 
        r.is_active, 
        r.created_at,
        COUNT(DISTINCT rm.id)::int AS members_count,
        COUNT(DISTINCT m.id)::int AS messages_count,
        BOOL_OR(rm.user_id = $1) IS TRUE AS is_member
      FROM chat_rooms r
      LEFT JOIN room_members rm ON rm.room_id = r.id
      LEFT JOIN messages m ON m.room_id = r.id
      WHERE r.is_active = true
      GROUP BY r.id
      ORDER BY r.name ASC;
    `;

    const result = await pool.query(query, [userId]);
    const liveMap = getLivePresenceMap();

    const roomsWithLive = result.rows.map((r) => ({
      ...r,
      live_count: liveMap[r.id]?.onlineCount || 0,
      active_users: liveMap[r.id]?.activeUsers || [],
    }));

    res.json({ rooms: roomsWithLive });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Failed to fetch chat rooms.' });
  }
});

// Get single room details with live presence
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;

    const result = await pool.query(
      `SELECT 
        r.id, 
        r.name, 
        r.description, 
        r.is_active, 
        r.created_at,
        COUNT(DISTINCT rm.id)::int AS members_count,
        BOOL_OR(rm.user_id = $1) IS TRUE AS is_member
       FROM chat_rooms r
       LEFT JOIN room_members rm ON rm.room_id = r.id
       WHERE r.id = $2
       GROUP BY r.id;`,
      [userId, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Chat room not found.' });
      return;
    }

    const liveMap = getLivePresenceMap();
    const roomWithLive = {
      ...result.rows[0],
      live_count: liveMap[id]?.onlineCount || 0,
      active_users: liveMap[id]?.activeUsers || [],
    };

    res.json({ room: roomWithLive });
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({ error: 'Failed to fetch room details.' });
  }
});

// Join room
router.post('/:id/join', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if room exists and is active
    const roomCheck = await pool.query('SELECT id, is_active FROM chat_rooms WHERE id = $1;', [id]);
    if (roomCheck.rows.length === 0 || !roomCheck.rows[0].is_active) {
      res.status(404).json({ error: 'Room not found or inactive.' });
      return;
    }

    await pool.query(
      `INSERT INTO room_members (room_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (room_id, user_id) DO NOTHING;`,
      [id, userId]
    );

    res.json({ message: 'Successfully joined room.' });
  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).json({ error: 'Failed to join room.' });
  }
});

// Leave room
router.post('/:id/leave', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await pool.query(
      `DELETE FROM room_members 
       WHERE room_id = $1 AND user_id = $2;`,
      [id, userId]
    );

    res.json({ message: 'Successfully left room.' });
  } catch (error) {
    console.error('Error leaving room:', error);
    res.status(500).json({ error: 'Failed to leave room.' });
  }
});

// Get room anonymous members (NO private auth data!)
router.get('/:id/members', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const result = await pool.query(
      `SELECT 
        u.anonymous_username,
        u.role,
        rm.joined_at
       FROM room_members rm
       JOIN users u ON u.id = rm.user_id
       WHERE rm.room_id = $1
       ORDER BY rm.joined_at ASC;`,
      [id]
    );

    const liveMap = getLivePresenceMap();
    const liveUsers = new Set(liveMap[id]?.activeUsers || []);

    const membersWithLiveStatus = result.rows.map((m) => ({
      ...m,
      is_online: liveUsers.has(m.anonymous_username),
    }));

    res.json({ members: membersWithLiveStatus });
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Failed to fetch room members.' });
  }
});

export default router;

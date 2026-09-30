import { Router, Response } from 'express';
import { pool } from '../db';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middleware/authMiddleware';

const router = Router();

// Apply auth + requireAdmin to all admin endpoints
router.use(authenticateToken);
router.use(requireAdmin);

// Admin dashboard statistics
router.get('/stats', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const statsQuery = `
      SELECT
        (SELECT COUNT(*) FROM chat_rooms)::int AS total_rooms,
        (SELECT COUNT(*) FROM chat_rooms WHERE is_active = true)::int AS active_rooms,
        (SELECT COUNT(*) FROM users)::int AS total_users,
        (SELECT COUNT(*) FROM messages)::int AS total_messages;
    `;
    const result = await pool.query(statsQuery);
    res.json({ stats: result.rows[0] });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve admin stats.' });
  }
});

// View all rooms (including inactive)
router.get('/rooms', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const query = `
      SELECT 
        r.id,
        r.name,
        r.description,
        r.is_active,
        r.created_at,
        r.updated_at,
        COUNT(DISTINCT rm.id)::int AS members_count,
        COUNT(DISTINCT m.id)::int AS messages_count
      FROM chat_rooms r
      LEFT JOIN room_members rm ON rm.room_id = r.id
      LEFT JOIN messages m ON m.room_id = r.id
      GROUP BY r.id
      ORDER BY r.created_at DESC;
    `;
    const result = await pool.query(query);
    res.json({ rooms: result.rows });
  } catch (error) {
    console.error('Admin rooms error:', error);
    res.status(500).json({ error: 'Failed to fetch rooms for admin.' });
  }
});

// Create new room
router.post('/rooms', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, description, is_active } = req.body;
    const adminId = req.user!.id;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Room name is required.' });
      return;
    }

    const cleanName = name.trim();

    // Check unique name
    const existing = await pool.query('SELECT id FROM chat_rooms WHERE LOWER(name) = LOWER($1);', [cleanName]);
    if (existing.rows.length > 0) {
      res.status(400).json({ error: 'A room with this name already exists.' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO chat_rooms (name, description, is_active, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description, is_active, created_at;`,
      [cleanName, (description || '').trim(), is_active !== false, adminId]
    );

    res.status(201).json({
      message: 'Room created successfully.',
      room: result.rows[0],
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Failed to create room.' });
  }
});

// Edit room
router.put('/rooms/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, is_active } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Room name is required.' });
      return;
    }

    const cleanName = name.trim();

    // Check conflict with other rooms
    const existing = await pool.query(
      'SELECT id FROM chat_rooms WHERE LOWER(name) = LOWER($1) AND id != $2;',
      [cleanName, id]
    );
    if (existing.rows.length > 0) {
      res.status(400).json({ error: 'Another room with this name already exists.' });
      return;
    }

    const result = await pool.query(
      `UPDATE chat_rooms
       SET name = $1, description = $2, is_active = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING id, name, description, is_active, updated_at;`,
      [cleanName, (description || '').trim(), is_active === true, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Room not found.' });
      return;
    }

    res.json({
      message: 'Room updated successfully.',
      room: result.rows[0],
    });
  } catch (error) {
    console.error('Edit room error:', error);
    res.status(500).json({ error: 'Failed to update room.' });
  }
});

// Delete or deactivate room
router.delete('/rooms/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM chat_rooms WHERE id = $1 RETURNING id, name;', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Room not found.' });
      return;
    }

    res.json({ message: `Room "${result.rows[0].name}" deleted successfully.` });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ error: 'Failed to delete room.' });
  }
});

// View all users (Privacy enforced: NO emails or auth passwords!)
router.get('/users', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const query = `
      SELECT 
        u.id,
        u.anonymous_username,
        u.role,
        u.is_suspended,
        u.preferences,
        u.created_at,
        COUNT(DISTINCT rm.id)::int AS joined_rooms_count,
        COUNT(DISTINCT m.id)::int AS total_messages_sent
      FROM users u
      LEFT JOIN room_members rm ON rm.user_id = u.id
      LEFT JOIN messages m ON m.sender_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC;
    `;
    const result = await pool.query(query);
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// Suspend or unsuspend user
router.put('/users/:id/suspend', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { is_suspended } = req.body;

    if (id === req.user!.id) {
      res.status(400).json({ error: 'You cannot suspend your own administrator account.' });
      return;
    }

    const result = await pool.query(
      `UPDATE users 
       SET is_suspended = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING id, anonymous_username, is_suspended;`,
      [is_suspended === true, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    res.json({
      message: `User ${result.rows[0].anonymous_username} ${is_suspended ? 'suspended' : 'reactivated'} successfully.`,
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ error: 'Failed to update user suspension status.' });
  }
});

// Remove user from a room
router.post('/users/:id/remove-room', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { room_id } = req.body;

    if (!room_id) {
      res.status(400).json({ error: 'room_id is required.' });
      return;
    }

    await pool.query('DELETE FROM room_members WHERE user_id = $1 AND room_id = $2;', [id, room_id]);

    res.json({ message: 'User removed from room.' });
  } catch (error) {
    console.error('Remove user from room error:', error);
    res.status(500).json({ error: 'Failed to remove user from room.' });
  }
});

export default router;

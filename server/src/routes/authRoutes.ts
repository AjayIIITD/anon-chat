import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import { JWT_SECRET, authenticateToken, AuthenticatedRequest } from '../middleware/authMiddleware';
import { generateUniqueAnonymousUsername } from '../utils/usernameGenerator';

const router = Router();

// Preview generated anonymous username based on preferences
router.post('/preview-username', async (req, res): Promise<void> => {
  try {
    const preferences = req.body.preferences || {};
    const username = await generateUniqueAnonymousUsername(preferences);
    res.json({ anonymous_username: username });
  } catch (error) {
    console.error('Error previewing username:', error);
    res.status(500).json({ error: 'Failed to generate username preview.' });
  }
});

// Signup
router.post('/signup', async (req, res): Promise<void> => {
  try {
    const { email, password, preferences, chosen_username } = req.body;

    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'A valid email address is required for account authentication.' });
      return;
    }

    if (!password || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if email already registered
    const existing = await pool.query('SELECT id FROM users WHERE email = $1;', [cleanEmail]);
    if (existing.rows.length > 0) {
      res.status(400).json({ error: 'An account with this email already exists. Please log in instead.' });
      return;
    }

    // Determine unique anonymous username
    let anonymousUsername = '';
    if (chosen_username && typeof chosen_username === 'string' && chosen_username.trim().length >= 3) {
      const candidate = chosen_username.trim();
      const nameCheck = await pool.query(
        'SELECT id FROM users WHERE LOWER(anonymous_username) = LOWER($1);',
        [candidate]
      );
      if (nameCheck.rows.length === 0) {
        anonymousUsername = candidate;
      }
    }

    if (!anonymousUsername) {
      anonymousUsername = await generateUniqueAnonymousUsername(preferences || {});
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const safePreferences = preferences || { interests: [], vibe: 'chill', topics: [] };

    // Insert user
    const insertRes = await pool.query(
      `INSERT INTO users (email, password_hash, anonymous_username, preferences, role)
       VALUES ($1, $2, $3, $4, 'user')
       RETURNING id, anonymous_username, role, preferences, created_at;`,
      [cleanEmail, passwordHash, anonymousUsername, JSON.stringify(safePreferences)]
    );

    const newUser = insertRes.rows[0];

    // Automatically join default General room
    const generalRoom = await pool.query(`SELECT id FROM chat_rooms WHERE name = 'General' LIMIT 1;`);
    if (generalRoom.rows.length > 0) {
      await pool.query(
        `INSERT INTO room_members (room_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING;`,
        [generalRoom.rows[0].id, newUser.id]
      );
    }

    // Sign JWT
    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Account successfully registered.',
      token,
      user: {
        id: newUser.id,
        anonymous_username: newUser.anonymous_username,
        role: newUser.role,
        preferences: newUser.preferences,
        created_at: newUser.created_at,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// Login
router.post('/login', async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    const userRes = await pool.query(
      `SELECT id, password_hash, anonymous_username, role, preferences, is_suspended, created_at
       FROM users 
       WHERE email = $1;`,
      [cleanEmail]
    );

    if (userRes.rows.length === 0) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const user = userRes.rows[0];

    if (user.is_suspended) {
      res.status(403).json({ error: 'Your account has been suspended by an administrator.' });
      return;
    }

    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Logged in successfully.',
      token,
      user: {
        id: user.id,
        anonymous_username: user.anonymous_username,
        role: user.role,
        preferences: user.preferences,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userRes = await pool.query(
      `SELECT id, anonymous_username, role, preferences, created_at, is_suspended
       FROM users 
       WHERE id = $1;`,
      [req.user!.id]
    );

    if (userRes.rows.length === 0) {
      res.status(404).json({ error: 'User profile not found.' });
      return;
    }

    const user = userRes.rows[0];

    // Fetch joined rooms count and list
    const roomsRes = await pool.query(
      `SELECT r.id, r.name, rm.joined_at
       FROM room_members rm
       JOIN chat_rooms r ON r.id = rm.room_id
       WHERE rm.user_id = $1 AND r.is_active = true
       ORDER BY rm.joined_at DESC;`,
      [user.id]
    );

    res.json({
      user: {
        id: user.id,
        anonymous_username: user.anonymous_username,
        role: user.role,
        preferences: user.preferences,
        created_at: user.created_at,
        joined_rooms: roomsRes.rows,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to retrieve user profile.' });
  }
});

// Regenerate Anonymous Username
router.post('/regenerate-username', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const newUsername = await generateUniqueAnonymousUsername(user.preferences || {});

    await pool.query(
      `UPDATE users 
       SET anonymous_username = $1, updated_at = NOW() 
       WHERE id = $2;`,
      [newUsername, user.id]
    );

    res.json({
      message: 'Anonymous identity regenerated successfully.',
      anonymous_username: newUsername,
    });
  } catch (error) {
    console.error('Regenerate username error:', error);
    res.status(500).json({ error: 'Failed to regenerate anonymous username.' });
  }
});

// Update Preferences
router.put('/preferences', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      res.status(400).json({ error: 'Valid preferences object is required.' });
      return;
    }

    await pool.query(
      `UPDATE users 
       SET preferences = $1, updated_at = NOW() 
       WHERE id = $2;`,
      [JSON.stringify(preferences), user.id]
    );

    res.json({
      message: 'Preferences updated successfully.',
      preferences,
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences.' });
  }
});

export default router;

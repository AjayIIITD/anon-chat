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

// Standard Email/Password Signup (strictly @iiitd.ac.in, requires DOB)
router.post('/signup', async (req, res): Promise<void> => {
  try {
    const { email, password, dob, preferences, chosen_username } = req.body;

    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'A valid IIIT-Delhi email address (@iiitd.ac.in) is required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    // STRICT INSTITUTIONAL DOMAIN CHECK: Must end with @iiitd.ac.in or .iiitd.ac.in
    const isIIITD = cleanEmail.endsWith('@iiitd.ac.in') || cleanEmail.endsWith('.iiitd.ac.in');
    if (!isIIITD) {
      res.status(403).json({
        error: `Registration Denied: Only institutional email addresses ending with @iiitd.ac.in are authorized. ("${cleanEmail}" is not permitted)`,
      });
      return;
    }

    if (!dob || typeof dob !== 'string' || !dob.trim()) {
      res.status(400).json({ error: 'Date of Birth (DOB) is required for registration.' });
      return;
    }

    if (!password || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      return;
    }

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
    const cleanDob = dob.trim();
    safePreferences.dob = cleanDob;

    // Insert user with DOB
    const insertRes = await pool.query(
      `INSERT INTO users (email, password_hash, anonymous_username, dob, preferences, role)
       VALUES ($1, $2, $3, $4, $5, 'user')
       RETURNING id, email, anonymous_username, dob, role, preferences, created_at;`,
      [cleanEmail, passwordHash, anonymousUsername, cleanDob, JSON.stringify(safePreferences)]
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
        email: newUser.email,
        anonymous_username: newUser.anonymous_username,
        dob: newUser.dob,
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

// Standard Email/Password Login (strictly @iiitd.ac.in)
router.post('/login', async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email && !password) {
      res.status(400).json({ 
        error: 'Mistake: Both email and password fields are empty. Please enter your credentials.',
        mistakeType: 'empty_form',
        field: 'all'
      });
      return;
    }

    if (!email || !email.trim()) {
      res.status(400).json({ 
        error: 'Mistake in Email: Email field is empty. Please enter your IIIT-Delhi student email.',
        mistakeType: 'empty_email',
        field: 'email'
      });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail.includes('@')) {
      res.status(400).json({ 
        error: `Mistake in Email: "${cleanEmail}" is missing "@". Institutional email format must be rollno@iiitd.ac.in.`,
        mistakeType: 'invalid_format',
        field: 'email'
      });
      return;
    }

    // STRICT INSTITUTIONAL DOMAIN CHECK
    const isIIITD = cleanEmail.endsWith('@iiitd.ac.in') || cleanEmail.endsWith('.iiitd.ac.in');
    if (!isIIITD) {
      const enteredDomain = cleanEmail.includes('@') ? '@' + cleanEmail.split('@')[1] : cleanEmail;
      res.status(403).json({
        error: `Domain Mistake: You entered "${cleanEmail}" (${enteredDomain}). Only institutional email addresses ending with @iiitd.ac.in are allowed.`,
        mistakeType: 'wrong_domain',
        field: 'email'
      });
      return;
    }

    if (!password) {
      res.status(400).json({ 
        error: 'Mistake in Password: Password field is empty. Please enter your password.',
        mistakeType: 'empty_password',
        field: 'password'
      });
      return;
    }

    const userRes = await pool.query(
      `SELECT id, email, password_hash, anonymous_username, dob, role, preferences, is_suspended, created_at
       FROM users 
       WHERE email = $1;`,
      [cleanEmail]
    );

    if (userRes.rows.length === 0) {
      res.status(404).json({ 
        error: `Account Not Found: No student account registered with "${cleanEmail}". Check for typos in your roll number or create an account.`,
        mistakeType: 'unregistered_email',
        field: 'email',
        suggestion: 'signup'
      });
      return;
    }

    const user = userRes.rows[0];

    if (user.is_suspended) {
      res.status(403).json({ 
        error: 'Account Suspended: Your account has been suspended by an administrator.',
        mistakeType: 'suspended',
        field: 'general'
      });
      return;
    }

    // If account was created via Google OAuth
    if (user.password_hash === 'GOOGLE_OAUTH_VERIFIED') {
      res.status(400).json({ 
        error: `Notice: This account ("${cleanEmail}") was created using Google OAuth, which has been removed. Please register a password account using the Sign Up page.`,
        mistakeType: 'use_google_oauth',
        field: 'email',
        suggestion: 'signup'
      });
      return;
    }

    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass) {
      res.status(401).json({ 
        error: `Password Mistake: The password for "${cleanEmail}" is incorrect. Check Caps Lock or re-type your password.`,
        mistakeType: 'incorrect_password',
        field: 'password'
      });
      return;
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Logged in successfully.',
      token,
      user: {
        id: user.id,
        email: user.email,
        anonymous_username: user.anonymous_username,
        dob: user.dob,
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

// Get current user profile (includes own email and DOB strictly for personal display)
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userRes = await pool.query(
      `SELECT id, email, anonymous_username, dob, role, preferences, created_at, is_suspended
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
        email: user.email,
        anonymous_username: user.anonymous_username,
        dob: user.dob,
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

// Regenerate Anonymous Username (disabled: persona locked once generated)
router.post('/regenerate-username', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.status(403).json({
    error: 'Anonymous identity is permanent once generated and cannot be regenerated.',
  });
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

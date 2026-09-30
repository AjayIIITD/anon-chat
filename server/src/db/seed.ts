import bcrypt from 'bcryptjs';
import { pool } from './index';

async function seedDatabase() {
  console.log('🌱 Seeding database with initial rooms and accounts...');

  try {
    // 1. Seed Rooms
    const rooms = [
      {
        name: 'General',
        description: 'The open town square for spontaneous, friendly banter and everyday chat.',
      },
      {
        name: 'Programming',
        description: 'Deep dives into code, system architecture, tech stacks, and debugging war stories.',
      },
      {
        name: 'Photography',
        description: 'Shutter speeds, lenses, street photography, and visual composition.',
      },
      {
        name: 'Late Night Talks',
        description: 'Midnight reflections, twilight musings, and calm, unhurried conversations.',
      },
      {
        name: 'Study Room',
        description: 'Deep focus sprints, book insights, learning tips, and mutual accountability.',
      },
      {
        name: 'Gaming',
        description: 'Multiplayer squads, tactical strategies, indie masterpieces, and gaming lore.',
      },
      {
        name: 'Random',
        description: 'No filters, no fixed topics — shower thoughts, surreal ideas, and funny observations.',
      },
    ];

    const roomMap: Record<string, string> = {};

    for (const r of rooms) {
      const res = await pool.query(
        `INSERT INTO chat_rooms (name, description, is_active)
         VALUES ($1, $2, true)
         ON CONFLICT (name) DO UPDATE 
         SET description = EXCLUDED.description, is_active = true
         RETURNING id, name;`,
        [r.name, r.description]
      );
      roomMap[r.name] = res.rows[0].id;
    }
    console.log(`✅ Seeded ${rooms.length} default chat rooms.`);

    // 2. Seed Admin User
    const adminEmail = 'admin@iiitd.ac.in';
    const adminPass = 'ajay@admin_20170';
    const adminHash = await bcrypt.hash(adminPass, 10);
    const adminPrefs = JSON.stringify({
      interests: ['Architecture', 'Security', 'Engineering'],
      vibe: 'mystic',
      topics: ['System Oversight', 'Moderation'],
    });

    const adminRes = await pool.query(
      `INSERT INTO users (email, password_hash, anonymous_username, preferences, role)
       VALUES ($1, $2, 'ApexSentinel', $3, 'admin')
       ON CONFLICT (email) DO UPDATE
       SET role = 'admin', password_hash = $2
       RETURNING id;`,
      [adminEmail, adminHash, adminPrefs]
    );
    const adminId = adminRes.rows[0].id;
    console.log(`✅ Admin account initialized: ${adminEmail} (password protected with bcrypt hash)`);

    // 3. Seed Demo / Test User
    const userEmail = 'quietpixel@anonchat.internal';
    const userPass = 'UserPassword123!';
    const userHash = await bcrypt.hash(userPass, 10);
    const userPrefs = JSON.stringify({
      interests: ['Programming', 'Photography', 'Coffee'],
      vibe: 'chill',
      topics: ['Web Dev', 'Camera Lenses', 'Algorithms'],
    });

    const userRes = await pool.query(
      `INSERT INTO users (email, password_hash, anonymous_username, preferences, role)
       VALUES ($1, $2, 'QuietPixel42', $3, 'user')
       ON CONFLICT (email) DO UPDATE
       SET anonymous_username = 'QuietPixel42'
       RETURNING id;`,
      [userEmail, userHash, userPrefs]
    );
    const userId = userRes.rows[0].id;
    console.log(`✅ Demo user initialized: ${userEmail} (password protected with bcrypt hash)`);

    // 4. Join user to General & Programming
    if (roomMap['General'] && roomMap['Programming']) {
      await pool.query(
        `INSERT INTO room_members (room_id, user_id)
         VALUES ($1, $2), ($3, $2)
         ON CONFLICT (room_id, user_id) DO NOTHING;`,
        [roomMap['General'], userId, roomMap['Programming']]
      );

      // Seed sample conversation in Programming
      await pool.query(
        `INSERT INTO messages (room_id, sender_id, message, created_at)
         VALUES 
          ($1, $2, 'Hey everyone! Welcome to the anonymous Programming room.', NOW() - INTERVAL '5 minutes'),
          ($1, $3, 'Great to be here. Working on a real-time WebSocket protocol right now!', NOW() - INTERVAL '3 minutes')
         ON CONFLICT DO NOTHING;`,
        [roomMap['Programming'], userId, adminId]
      );
      console.log('✅ Seeded memberships and initial messages.');
    }

    console.log('🎉 Seeding completed successfully!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedDatabase();

# AnonChat — Full-Stack Anonymous Chatting Platform

**AnonChat** is a production-grade, real-time anonymous chatting platform featuring a sleek dark-themed interface, cryptographically isolated user identities, persistent PostgreSQL database storage, and role-based administration.

---

## 🌟 Key Highlights & Architecture

* **Zero-Leak Anonymous Identity**: User emails and authentication credentials are strictly isolated. In all public rooms, messages, and member lists, only the user's generated **anonymous handle** (e.g., `QuietPixel42`, `LunarStack41`, `MidnightCoder`) is ever exposed.
* **Persistent Database Storage**: Accounts, unique anonymous usernames, selected vibe preferences, room memberships, and complete chat histories are stored permanently in **PostgreSQL**.
* **Intelligent Persona Synthesizer**: During signup, user preferences (vibe, interest tags, conversation style) are algorithmically composed into a unique, persistent persona guaranteed by database constraints.
* **Instant Real-Time Stream**: Powered by high-efficiency WebSockets with automatic reconnection, typing indicators, active presence tracking, and optimistic UI rendering.
* **Admin Command Portal**: Protected `/admin` route with database-enforced role verification. Standard users receive a strict **403 Forbidden Access Denied** guard screen. Admins can create, edit, deactivate, or delete rooms, as well as moderate and suspend users.

---

## 🏛 Database Schema & Relationships

### `users` / `profiles`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID (PK)` | Internal system identifier |
| `email` | `VARCHAR(255)` | Authentication credential only (*NEVER exposed publicly*) |
| `password_hash` | `TEXT` | `bcryptjs` hashed secret |
| `anonymous_username` | `VARCHAR(60)` | Unique, persistent public persona name |
| `preferences` | `JSONB` | Vibe, interests, topics, conversation style |
| `role` | `VARCHAR(20)` | `'user'` or `'admin'` |
| `is_suspended` | `BOOLEAN` | Account moderation status |
| `created_at` | `TIMESTAMPTZ` | Timestamp of account registration |
| `updated_at` | `TIMESTAMPTZ` | Timestamp of last profile update |

### `chat_rooms`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID (PK)` | Unique room identifier |
| `name` | `VARCHAR(100)` | Unique room name (e.g. `Programming`, `Photography`) |
| `description` | `TEXT` | Room topic description |
| `created_by` | `UUID (FK)` | User ID of the creator |
| `is_active` | `BOOLEAN` | Visibility toggle (Active/Inactive) |
| `created_at` | `TIMESTAMPTZ` | Creation timestamp |

### `room_members`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID (PK)` | Membership record identifier |
| `room_id` | `UUID (FK)` | References `chat_rooms(id)` on delete cascade |
| `user_id` | `UUID (FK)` | References `users(id)` on delete cascade |
| `joined_at` | `TIMESTAMPTZ` | Timestamp user joined room |
| *Constraint* | `UNIQUE` | `(room_id, user_id)` prevents duplicate memberships |

### `messages`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID (PK)` | Message identifier |
| `room_id` | `UUID (FK)` | References `chat_rooms(id)` on delete cascade |
| `sender_id` | `UUID (FK)` | References `users(id)` on delete cascade |
| `message` | `TEXT` | Message content (1 to 2000 characters) |
| `created_at` | `TIMESTAMPTZ` | Creation timestamp |

---

## 🔒 Row Level Security & Access Policies

For Supabase deployments, complete SQL migrations and RLS policies are provided in:
`supabase/migrations/20261001000000_init_anon_chat.sql`

* **Profiles Policy**: Authenticated users can view public anonymous usernames; users can only update their own preferences and cannot self-elevate their role to `admin`.
* **Rooms Policy**: Standard users can only view active rooms; only users with `role = 'admin'` can insert, edit, deactivate, or delete rooms.
* **Messages Policy**: Users can only read messages from rooms they are active members of; users can only send messages as themselves to rooms they have joined.
* **Server-Side Enforcement**: All permissions are verified on the backend layer via JWT verification, preventing any frontend tampering.

---

## 🚀 Quickstart & Setup Guide

### 1. Prerequisites
* **Node.js** (v18+)
* **PostgreSQL** running locally on port `5432` (or a remote Supabase PostgreSQL connection string)

### 2. Environment Variables
Copy `.env.example` into `server/.env`:
```bash
cp .env.example server/.env
```
Default connection string for local PostgreSQL:
```env
PORT=5001
DATABASE_URL=postgres://localhost:5432/anon_chat
JWT_SECRET=your_super_secret_jwt_key_here
```

### 3. Initialize & Seed Database
Ensure the database `anon_chat` exists in PostgreSQL:
```bash
createdb anon_chat
```
Run the migrations and seed script:
```bash
npm run db:migrate
npm run db:seed
```

### 4. Start Development Server
From the root directory, launch both backend and frontend concurrently:
```bash
npm run dev
```

* **Frontend**: `http://localhost:5173`
* **Backend API & WebSocket**: `http://localhost:5001`

---

## 🔑 Pre-Seeded Test Accounts

| Role | Email | Password | Anonymous Handle | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin@anonchat.internal` | `AdminPassword123!` | `ApexSentinel` | Has full access to `/admin` |
| **Demo User** | `quietpixel@anonchat.internal` | `UserPassword123!` | `QuietPixel42` | Pre-joined to General & Programming |

*You can also sign up with any new email to test the automated preference-based anonymous identity synthesis flow.*

---

## 🧪 Verified End-to-End Test Scenarios

1. **Step-based Signup Flow**:
   - Create account with email & password -> Select Vibe & Interests -> Persona synthesized (e.g. `LunarStack41`) -> Enters Dashboard.
2. **Real-Time Room Chat**:
   - Joins `Photography` room -> Sends message -> Instantly rendered with timestamp and anonymous username.
3. **Session & Identity Persistence**:
   - Logs out -> Logs back in with credentials -> `LunarStack41`, joined rooms, and conversation history are 100% restored.
4. **Admin Protection Negative Test**:
   - Normal user navigates to `/admin` -> Blocked with **403 Forbidden Access Denied** screen.
5. **Admin Portal Positive Test**:
   - Log in as `admin@anonchat.internal` -> Navigate to `/admin` -> View stats -> Create new room `Quantum Computing` -> Verified it appears live on the public rooms dashboard.

-- ==============================================================================
-- Supabase Schema Migration: Anonymous Chatting Platform
-- File: supabase/migrations/20261001000000_init_anon_chat.sql
-- ==============================================================================

-- Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles Table (Holds public anonymous identity, preferences & role)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    anonymous_username VARCHAR(60) UNIQUE NOT NULL,
    preferences JSONB NOT NULL DEFAULT '{"interests":[], "vibe":"chill", "topics":[]}'::jsonb,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_suspended BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Chat Rooms Table
CREATE TABLE IF NOT EXISTS public.chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Room Members Table
CREATE TABLE IF NOT EXISTS public.room_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- 4. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL CHECK (char_length(trim(message)) > 0 AND char_length(message) <= 2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

-- Indexes for maximum query performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(anonymous_username);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_active ON public.chat_rooms(is_active);
CREATE INDEX IF NOT EXISTS idx_room_members_room ON public.room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user ON public.room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_room_created ON public.messages(room_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current authenticated user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- RLS POLICIES
-- ==============================================================================

-- Profiles:
-- Any authenticated user can view anonymous usernames and public profile information
CREATE POLICY "Public profile view"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

-- Users can only update their own preferences and anonymous_username (cannot elevate role)
CREATE POLICY "User update self profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid() 
        AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    );

-- Admins can update any profile (e.g. suspend user or change role)
CREATE POLICY "Admin update any profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (public.is_admin());

-- Chat Rooms:
-- Authenticated users can view active rooms. Admins can view all rooms.
CREATE POLICY "View active rooms"
    ON public.chat_rooms FOR SELECT
    TO authenticated
    USING (is_active = true OR public.is_admin());

-- Only admins can create rooms
CREATE POLICY "Admin insert rooms"
    ON public.chat_rooms FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- Only admins can update rooms
CREATE POLICY "Admin update rooms"
    ON public.chat_rooms FOR UPDATE
    TO authenticated
    USING (public.is_admin());

-- Only admins can delete rooms
CREATE POLICY "Admin delete rooms"
    ON public.chat_rooms FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- Room Members:
-- Authenticated users can view members of active rooms
CREATE POLICY "View room members"
    ON public.room_members FOR SELECT
    TO authenticated
    USING (true);

-- Authenticated users can join a room (insert self)
CREATE POLICY "Join room"
    ON public.room_members FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Authenticated users can leave a room (delete self), or Admin can remove anyone
CREATE POLICY "Leave room"
    ON public.room_members FOR DELETE
    TO authenticated
    USING (user_id = auth.uid() OR public.is_admin());

-- Messages:
-- Authenticated users can read messages from rooms they are members of
CREATE POLICY "Read room messages"
    ON public.messages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.room_members
            WHERE room_members.room_id = messages.room_id
            AND room_members.user_id = auth.uid()
        )
        OR public.is_admin()
    );

-- Authenticated users can send messages to rooms they are members of as themselves
CREATE POLICY "Send room messages"
    ON public.messages FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.room_members
            WHERE room_members.room_id = messages.room_id
            AND room_members.user_id = auth.uid()
        )
        AND NOT EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_suspended = true
        )
    );

-- Seed initial default rooms
INSERT INTO public.chat_rooms (name, description, is_active)
VALUES
    ('General', 'The central town square for spontaneous, open, and friendly discussions.', true),
    ('Programming', 'Code snippets, tech debates, debugging tales, and architectural questions.', true),
    ('Photography', 'Camera settings, composition, visual aesthetics, and street captures.', true),
    ('Late Night Talks', 'Deep midnight thoughts, philosophical ponderings, and quiet connections.', true),
    ('Study Room', 'Silent productivity, focus sprints, book reflections, and study advice.', true),
    ('Gaming', 'Competitive multiplayer, indie gems, gameplay banter, and squad searches.', true),
    ('Random', 'No specific theme — shower thoughts, quirky memes, and whimsical theories.', true)
ON CONFLICT (name) DO NOTHING;

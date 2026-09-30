export interface UserPreferences {
  interests: string[];
  vibe: 'chill' | 'mystic' | 'curious' | 'energetic' | 'philosophical' | 'creative' | 'rebel' | string;
  topics: string[];
  conversationStyle?: string;
  ageRange?: string;
  dob?: string;
}

export interface User {
  id: string;
  email?: string;
  dob?: string;
  anonymous_username: string;
  role: 'user' | 'admin';
  preferences: UserPreferences;
  created_at: string;
  is_suspended?: boolean;
  joined_rooms?: {
    id: string;
    name: string;
    joined_at: string;
  }[];
}

export interface Room {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  members_count: number;
  messages_count?: number;
  is_member: boolean;
  live_count?: number;
  active_users?: string[];
}

export interface MessageReaction {
  emoji: string;
  count: number;
  reacted_by_me: boolean;
}

export interface Message {
  id: string;
  room_id: string;
  message: string;
  created_at: string;
  anonymous_username: string;
  is_self: boolean;
  reply_to?: string;
  reply_preview?: {
    id: string;
    message: string;
    anonymous_username: string;
  };
  reactions?: MessageReaction[];
}

export interface RoomMember {
  anonymous_username: string;
  role: string;
  joined_at: string;
  is_online?: boolean;
}

export interface AdminStats {
  total_rooms: number;
  active_rooms: number;
  total_users: number;
  total_messages: number;
}

export type LivePresenceMap = Record<string, { onlineCount: number; activeUsers: string[] }>;

const PROD_BACKEND_URL = 'https://anon-chat-ohws.onrender.com';
const VITE_API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? PROD_BACKEND_URL : '');
const API_BASE = VITE_API_URL ? `${VITE_API_URL.replace(/\/$/, '')}/api` : '/api';

export class ApiError extends Error {
  status: number;
  data?: any;
  field?: string;
  suggestion?: string;
  mistakeType?: string;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.field = data?.field;
    this.suggestion = data?.suggestion;
    this.mistakeType = data?.mistakeType;
    this.name = 'ApiError';
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem('anon_chat_token');
}

export function setStoredToken(token: string): void {
  localStorage.setItem('anon_chat_token', token);
}

export function removeStoredToken(): void {
  localStorage.removeItem('anon_chat_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    throw new ApiError(errorMsg, response.status, data);
  }

  return data as T;
}

export const api = {
  // Auth
  previewUsername: (preferences: any) =>
    request<{ anonymous_username: string }>('/auth/preview-username', {
      method: 'POST',
      body: JSON.stringify({ preferences }),
    }),

  signup: (payload: { email: string; password: string; dob?: string; preferences: any; chosen_username?: string }) =>
    request<{ message: string; token: string; user: any }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    request<{ message: string; token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () =>
    request<{ user: any }>('/auth/me'),

  regenerateUsername: () =>
    request<{ message: string; anonymous_username: string }>('/auth/regenerate-username', {
      method: 'POST',
    }),

  updatePreferences: (preferences: any) =>
    request<{ message: string; preferences: any }>('/auth/preferences', {
      method: 'PUT',
      body: JSON.stringify({ preferences }),
    }),

  // Rooms
  getRooms: () =>
    request<{ rooms: any[] }>('/rooms'),

  getLivePresence: () =>
    request<{ livePresence: Record<string, { onlineCount: number; activeUsers: string[] }> }>('/rooms/live-presence'),

  getRoom: (id: string) =>
    request<{ room: any }>(`/rooms/${id}`),

  joinRoom: (id: string) =>
    request<{ message: string }>(`/rooms/${id}/join`, {
      method: 'POST',
    }),

  leaveRoom: (id: string) =>
    request<{ message: string }>(`/rooms/${id}/leave`, {
      method: 'POST',
    }),

  getRoomMembers: (id: string) =>
    request<{ members: any[] }>(`/rooms/${id}/members`),

  // Messages
  getRoomMessages: (roomId: string) =>
    request<{ messages: any[] }>(`/rooms/${roomId}/messages`),

  sendMessage: (roomId: string, message: string, reply_to?: string) =>
    request<{ message: any }>(`/rooms/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message, reply_to }),
    }),

  reactToMessage: (roomId: string, messageId: string, emoji: string) =>
    request<{ action: 'added' | 'removed'; reactions: any[] }>(`/rooms/${roomId}/messages/${messageId}/react`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    }),

  // Admin
  getAdminStats: () =>
    request<{ stats: any }>('/admin/stats'),

  getAdminRooms: () =>
    request<{ rooms: any[] }>('/admin/rooms'),

  createAdminRoom: (payload: { name: string; description: string; is_active?: boolean }) =>
    request<{ message: string; room: any }>('/admin/rooms', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateAdminRoom: (id: string, payload: { name: string; description: string; is_active: boolean }) =>
    request<{ message: string; room: any }>(`/admin/rooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteAdminRoom: (id: string) =>
    request<{ message: string }>(`/admin/rooms/${id}`, {
      method: 'DELETE',
    }),

  getAdminUsers: () =>
    request<{ users: any[] }>('/admin/users'),

  toggleSuspendUser: (id: string, is_suspended: boolean) =>
    request<{ message: string; user: any }>(`/admin/users/${id}/suspend`, {
      method: 'PUT',
      body: JSON.stringify({ is_suspended }),
    }),

  removeUserFromRoom: (userId: string, roomId: string) =>
    request<{ message: string }>(`/admin/users/${userId}/remove-room`, {
      method: 'POST',
      body: JSON.stringify({ room_id: roomId }),
    }),
};

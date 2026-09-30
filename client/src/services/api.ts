const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
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
    throw new ApiError(errorMsg, response.status);
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

  signup: (payload: { email: string; password: string; preferences: any; chosen_username?: string }) =>
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

  sendMessage: (roomId: string, message: string) =>
    request<{ message: any }>(`/rooms/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
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

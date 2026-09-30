import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  MessageSquare, 
  Users, 
  Plus, 
  Edit3, 
  Trash2, 
  Power, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Search,
  Eye,
  Lock,
  Layers,
  Mail,
  Calendar
} from 'lucide-react';
import { AdminGuard } from '../components/AdminGuard';
import { CreateRoomModal } from '../components/CreateRoomModal';
import { EditRoomModal } from '../components/EditRoomModal';
import { api } from '../services/api';
import { AdminStats, Room } from '../types';

interface AdminPageProps {
  onNavigateHome: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onNavigateHome }) => {
  const [activeTab, setActiveTab] = useState<'rooms' | 'users'>('rooms');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [editingRoom, setEditingRoom] = useState<any | null>(null);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, roomsRes, usersRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminRooms(),
        api.getAdminUsers(),
      ]);

      setStats(statsRes.stats);
      setRooms(roomsRes.rooms);
      setUsers(usersRes.users);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch administrator data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleRoomStatus = async (room: any) => {
    try {
      const res = await api.updateAdminRoom(room.id, {
        name: room.name,
        description: room.description || '',
        is_active: !room.is_active,
      });
      setRooms(rooms.map(r => r.id === room.id ? { ...r, is_active: res.room.is_active } : r));
      setFeedback(`Room "${room.name}" status updated to ${res.room.is_active ? 'Active' : 'Inactive'}.`);
    } catch (err: any) {
      setError(err.message || 'Failed to toggle room status.');
    }
  };

  const handleDeleteRoom = async (room: any) => {
    if (!window.confirm(`Are you sure you want to permanently delete room "${room.name}"?`)) return;

    try {
      await api.deleteAdminRoom(room.id);
      setRooms(rooms.filter(r => r.id !== room.id));
      setFeedback(`Room "${room.name}" was deleted.`);
    } catch (err: any) {
      setError(err.message || 'Failed to delete room.');
    }
  };

  const handleToggleSuspendUser = async (u: any) => {
    const actionName = u.is_suspended ? 'reactivate' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${actionName} user "${u.anonymous_username}"?`)) return;

    try {
      const res = await api.toggleSuspendUser(u.id, !u.is_suspended);
      setUsers(users.map(userItem => userItem.id === u.id ? { ...userItem, is_suspended: res.user.is_suspended } : userItem));
      setFeedback(`User "${u.anonymous_username}" has been ${res.user.is_suspended ? 'suspended' : 'reactivated'}.`);
    } catch (err: any) {
      setError(err.message || 'Failed to update user suspension state.');
    }
  };

  return (
    <AdminGuard onNavigateHome={onNavigateHome}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <CreateRoomModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onRoomCreated={(newRoom) => {
            setRooms([newRoom, ...rooms]);
            setFeedback(`Room "${newRoom.name}" created successfully.`);
            fetchAdminData();
          }}
        />

        <EditRoomModal
          isOpen={Boolean(editingRoom)}
          room={editingRoom}
          onClose={() => setEditingRoom(null)}
          onRoomUpdated={(updatedRoom) => {
            setRooms(rooms.map(r => r.id === updatedRoom.id ? { ...r, ...updatedRoom } : r));
            setFeedback(`Room "${updatedRoom.name}" updated successfully.`);
          }}
        />

        {/* Admin Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Shield className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Administrator Command Portal
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Authorized room management, system telemetry, and user moderation
            </p>
          </div>

          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl glass-card hover:bg-white/[0.08] text-xs font-semibold text-slate-300 border border-white/10 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
        </div>

        {/* Feedback / Alert notifications */}
        {feedback && (
          <div className="mb-6 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-emerald-300 text-xs animate-fade-in">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{feedback}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-emerald-400 font-bold ml-2">×</button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between text-rose-300 text-xs">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-400 font-bold ml-2">×</button>
          </div>
        )}

        {/* Statistics Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-5 rounded-2xl border border-white/[0.08]">
            <span className="text-xs text-slate-400 block mb-1">Total Chat Rooms</span>
            <div className="text-2xl font-bold text-white font-mono">{stats?.total_rooms || 0}</div>
            <span className="text-[11px] text-emerald-400 mt-1 block">{stats?.active_rooms || 0} active</span>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-white/[0.08]">
            <span className="text-xs text-slate-400 block mb-1">Registered Users</span>
            <div className="text-2xl font-bold text-white font-mono">{stats?.total_users || 0}</div>
            <span className="text-[11px] text-violet-400 mt-1 block">100% Anonymous personas</span>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-white/[0.08]">
            <span className="text-xs text-slate-400 block mb-1">Total Messages Sent</span>
            <div className="text-2xl font-bold text-white font-mono">{stats?.total_messages || 0}</div>
            <span className="text-[11px] text-cyan-400 mt-1 block">Persisted in PostgreSQL</span>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-white/[0.08]">
            <span className="text-xs text-slate-400 block mb-1">Privacy Engine</span>
            <div className="text-2xl font-bold text-emerald-400 font-mono">L4 Guard</div>
            <span className="text-[11px] text-slate-400 mt-1 block">Zero auth data exposed</span>
          </div>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex items-center space-x-4 border-b border-white/[0.08] mb-6">
          <button
            id="admin-tab-rooms-btn"
            onClick={() => setActiveTab('rooms')}
            className={`pb-3 font-semibold text-sm transition-all flex items-center space-x-2 border-b-2 ${
              activeTab === 'rooms'
                ? 'border-violet-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Room Management ({rooms.length})</span>
          </button>

          <button
            id="admin-tab-users-btn"
            onClick={() => setActiveTab('users')}
            className={`pb-3 font-semibold text-sm transition-all flex items-center space-x-2 border-b-2 ${
              activeTab === 'users'
                ? 'border-violet-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Moderation ({users.length})</span>
          </button>
        </div>

        {/* TAB 1: ROOM MANAGEMENT */}
        {activeTab === 'rooms' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                Create, configure, toggle or delete rooms
              </span>

              <button
                id="admin-open-create-room-btn"
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Room</span>
              </button>
            </div>

            <div className="glass-panel rounded-2xl border border-white/[0.08] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.07] bg-slate-900/40 text-[11px] uppercase tracking-wider text-slate-400">
                      <th className="p-4">Room Name</th>
                      <th className="p-4">Description</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Members</th>
                      <th className="p-4">Messages</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05] text-xs text-slate-200">
                    {rooms.map((r) => (
                      <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 font-bold text-white font-mono">
                          #{r.name}
                        </td>
                        <td className="p-4 max-w-xs text-slate-300 truncate">
                          {r.description || '—'}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            r.is_active
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${r.is_active ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                            <span>{r.is_active ? 'Active' : 'Inactive'}</span>
                          </span>
                        </td>
                        <td className="p-4 font-mono text-slate-300">
                          {r.members_count || 0}
                        </td>
                        <td className="p-4 font-mono text-slate-300">
                          {r.messages_count || 0}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            id={`admin-edit-room-${r.id}`}
                            onClick={() => setEditingRoom(r)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                            title="Edit room"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            id={`admin-toggle-room-${r.id}`}
                            onClick={() => handleToggleRoomStatus(r)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              r.is_active
                                ? 'text-amber-400 hover:bg-amber-500/10'
                                : 'text-emerald-400 hover:bg-emerald-500/10'
                            }`}
                            title={r.is_active ? 'Deactivate room' : 'Activate room'}
                          >
                            <Power className="w-4 h-4" />
                          </button>

                          <button
                            id={`admin-delete-room-${r.id}`}
                            onClick={() => handleDeleteRoom(r)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete room"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USER MODERATION */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs text-slate-300 font-semibold block">
                  Registered Student Directory & Moderation
                </span>
                <span className="text-[11px] text-slate-400">
                  Showing authenticated student emails, verified dates of birth (DOB), and persona handles
                </span>
              </div>

              {/* User search bar */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="admin-user-search-input"
                  type="text"
                  placeholder="Search by email, username, DOB..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-mono"
                />
              </div>
            </div>

            <div className="glass-panel rounded-2xl border border-white/[0.08] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.07] bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-400">
                      <th className="p-4">Anonymous Persona</th>
                      <th className="p-4">Student Email</th>
                      <th className="p-4">Date of Birth (DOB)</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Created Date</th>
                      <th className="p-4">Activity</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Moderation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05] text-xs text-slate-200">
                    {users
                      .filter((u) => {
                        if (!userSearch.trim()) return true;
                        const q = userSearch.toLowerCase();
                        return (
                          (u.anonymous_username && u.anonymous_username.toLowerCase().includes(q)) ||
                          (u.email && u.email.toLowerCase().includes(q)) ||
                          (u.dob && u.dob.toLowerCase().includes(q))
                        );
                      })
                      .map((u) => (
                        <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-md">
                                {u.anonymous_username ? u.anonymous_username.charAt(0) : 'U'}
                              </div>
                              <div>
                                <span className="font-bold text-white font-mono block text-sm">
                                  {u.anonymous_username}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  UUID: {u.id.substring(0, 8)}...
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Student Email Address */}
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              <span className="font-mono text-cyan-300 font-semibold text-xs bg-cyan-950/40 px-2.5 py-1 rounded-lg border border-cyan-500/20 select-all">
                                {u.email || <span className="text-slate-500 italic">No email</span>}
                              </span>
                            </div>
                          </td>

                          {/* Date of Birth (DOB) */}
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                              {u.dob ? (
                                <span className="font-mono text-violet-200 font-medium text-xs bg-violet-950/30 px-2.5 py-1 rounded-lg border border-violet-500/20">
                                  {u.dob}
                                </span>
                              ) : (
                                <span className="text-slate-500 italic text-[11px]">Not provided</span>
                              )}
                            </div>
                          </td>

                          {/* Role */}
                          <td className="p-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                              u.role === 'admin'
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}>
                              {u.role}
                            </span>
                          </td>

                          {/* Created Date */}
                          <td className="p-4 text-slate-400 font-mono text-[11px]">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>

                          {/* Activity */}
                          <td className="p-4">
                            <div className="flex items-center space-x-2 text-[11px] font-mono">
                              <span className="text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-white/5" title="Joined Rooms">
                                {u.joined_rooms_count || 0} rooms
                              </span>
                              <span className="text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-white/5" title="Messages Sent">
                                {u.total_messages_sent || 0} msgs
                              </span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="p-4">
                            <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              u.is_suspended
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${u.is_suspended ? 'bg-rose-500' : 'bg-emerald-400'}`} />
                              <span>{u.is_suspended ? 'Suspended' : 'Active'}</span>
                            </span>
                          </td>

                          {/* Moderation Actions */}
                          <td className="p-4 text-right">
                            <button
                              id={`admin-suspend-user-${u.id}`}
                              onClick={() => handleToggleSuspendUser(u)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                u.is_suspended
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20'
                                  : 'bg-rose-500/10 border-rose-500/20 text-rose-300 hover:bg-rose-500/20'
                              }`}
                            >
                              {u.is_suspended ? 'Reactivate' : 'Suspend'}
                            </button>
                          </td>
                        </tr>
                      ))}

                    {users.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                          No registered users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
};

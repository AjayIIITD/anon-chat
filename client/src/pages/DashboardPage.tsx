import React, { useState, useEffect } from 'react';
import {
  Users,
  MessageSquare,
  Search,
  Compass,
  LogIn,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Radio,
  Activity,
  Flame
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { Room, LivePresenceMap } from '../types';

interface DashboardPageProps {
  onNavigate: (tab: string, roomId?: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [liveMap, setLiveMap] = useState<LivePresenceMap>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'live' | 'joined'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getRooms();
      setRooms(res.rooms);

      // Populate initial liveMap if provided from API
      const initialMap: LivePresenceMap = {};
      res.rooms.forEach(r => {
        if (r.live_count !== undefined) {
          initialMap[r.id] = {
            onlineCount: r.live_count,
            activeUsers: r.active_users || [],
          };
        }
      });
      setLiveMap(prev => ({ ...prev, ...initialMap }));
    } catch (err: any) {
      setError(err.message || 'Failed to load chat rooms.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();

    // Listen to real-time live presence updates across all rooms
    const socket = getSocket();

    const handleAllPresence = (data: LivePresenceMap) => {
      setLiveMap(data);
    };

    socket.on('all_rooms_presence', handleAllPresence);

    return () => {
      socket.off('all_rooms_presence', handleAllPresence);
    };
  }, []);

  const handleJoin = async (room: Room) => {
    setActionLoadingId(room.id);
    try {
      await api.joinRoom(room.id);
      setRooms(rooms.map(r => r.id === room.id ? { ...r, is_member: true, members_count: r.members_count + 1 } : r));
    } catch (err: any) {
      setError(err.message || 'Failed to join room.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleLeave = async (room: Room) => {
    setActionLoadingId(room.id);
    try {
      await api.leaveRoom(room.id);
      setRooms(rooms.map(r => r.id === room.id ? { ...r, is_member: false, members_count: Math.max(0, r.members_count - 1) } : r));
    } catch (err: any) {
      setError(err.message || 'Failed to leave room.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Helper to get real-time live count for any room
  const getRoomLiveCount = (roomId: string, fallbackCount?: number): number => {
    return liveMap[roomId]?.onlineCount ?? fallbackCount ?? 0;
  };

  const getRoomActiveUsers = (roomId: string, fallbackUsers?: string[]): string[] => {
    return liveMap[roomId]?.activeUsers ?? fallbackUsers ?? [];
  };

  // Calculate total live users across all rooms
  const totalLiveUsersAcrossPlatform = Object.values(liveMap).reduce(
    (sum, cur) => sum + (cur.onlineCount || 0),
    0
  );

  const filteredRooms = rooms.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    const liveCount = getRoomLiveCount(r.id, r.live_count);

    if (filterType === 'live') {
      return liveCount > 0;
    }
    if (filterType === 'joined') {
      return r.is_member;
    }
    return true;
  });

  const joinedRooms = rooms.filter(r => r.is_member);
  const liveRooms = rooms.filter(r => getRoomLiveCount(r.id, r.live_count) > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Welcome Banner */}
      <div className="relative glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl overflow-hidden mb-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-violet-600/15 via-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Incognito Session Active</span>
              </div>

              {/* Platform-wide Live Telemetry Pill */}
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold shadow-sm shadow-emerald-500/10">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>
                  {totalLiveUsersAcrossPlatform > 0
                    ? `${totalLiveUsersAcrossPlatform} user${totalLiveUsersAcrossPlatform === 1 ? '' : 's'} live right now`
                    : 'Real-time presence monitoring'}
                </span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Welcome, <span className="bg-gradient-to-r from-violet-400 via-indigo-200 to-cyan-300 bg-clip-text text-transparent">{user?.anonymous_username || 'Anonymous'}</span>
            </h1>

            <p className="text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
              Explore public topic rooms, see who is currently active live, and engage in real-time anonymous banter.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => onNavigate('profile')}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl glass-card hover:bg-white/[0.08] text-xs font-semibold text-slate-200 border border-white/10 hover:border-violet-500/40 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span>Identity Profile</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center space-x-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Access: Joined Rooms Strip */}
      {joinedRooms.length > 0 && filterType === 'all' && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h2 className="text-lg font-bold text-white tracking-tight">
                Your Active Rooms ({joinedRooms.length})
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {joinedRooms.map((room) => {
              const liveCount = getRoomLiveCount(room.id, room.live_count);
              const liveUsers = getRoomActiveUsers(room.id, room.active_users);

              return (
                <div
                  key={room.id}
                  className="glass-card p-5 rounded-2xl border border-violet-500/30 hover:border-violet-500/60 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-white text-base group-hover:text-violet-300 transition-colors">
                        #{room.name}
                      </span>

                      {/* Live Badge on Joined Room Card */}
                      {liveCount > 0 ? (
                        <span
                          title={`Currently in room: ${liveUsers.join(', ')}`}
                          className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold shadow-sm shadow-emerald-500/20 animate-pulse"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>{liveCount} Live Now</span>
                        </span>
                      ) : (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.05] text-slate-400 border border-white/[0.08] font-medium">
                          0 Live
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                      {room.description || 'No description provided.'}
                    </p>

                    {/* Active users preview if any */}
                    {liveUsers.length > 0 && (
                      <div className="mb-3 p-2 rounded-xl bg-slate-900/60 border border-emerald-500/20 text-[11px] text-slate-300 flex items-center space-x-1.5">
                        <Activity className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="text-emerald-400 font-semibold">Active:</span>
                        <span className="truncate text-slate-300 font-mono">
                          {liveUsers.slice(0, 3).join(', ')}{liveUsers.length > 3 ? ` +${liveUsers.length - 3}` : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                    <span className="text-xs text-slate-400 flex items-center space-x-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{room.members_count} total members</span>
                    </span>

                    <button
                      id={`enter-room-${room.id}`}
                      onClick={() => onNavigate('chat', room.id)}
                      className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/25 transition-all"
                    >
                      <span>Enter Chat</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Rooms Section */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
              <span>Chat Rooms</span>
              <span className="text-xs text-violet-400 font-mono">({filteredRooms.length})</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Check real-time live member activity and enter any topic room
            </p>
          </div>

          {/* Search bar & Live Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Filter pills */}
            <div className="flex items-center p-1 rounded-xl bg-slate-900/80 border border-white/10 text-xs">
              <button
                id="filter-all-rooms-btn"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${filterType === 'all'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                All ({rooms.length})
              </button>

              <button
                id="filter-live-rooms-btn"
                onClick={() => setFilterType('live')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${filterType === 'live'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-400 hover:text-emerald-300'
                  }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Live Now ({liveRooms.length})</span>
              </button>

              <button
                id="filter-joined-rooms-btn"
                onClick={() => setFilterType('joined')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${filterType === 'joined'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                Joined ({joinedRooms.length})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                id="dashboard-search-rooms-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rooms..."
                className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-slate-900/60 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Loading State Skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="glass-card p-6 rounded-2xl animate-pulse space-y-4">
                <div className="h-5 bg-slate-800 rounded w-1/2" />
                <div className="h-4 bg-slate-800/60 rounded w-full" />
                <div className="h-4 bg-slate-800/40 rounded w-3/4" />
                <div className="pt-4 flex justify-between items-center border-t border-slate-800">
                  <div className="h-4 bg-slate-800 rounded w-1/4" />
                  <div className="h-8 bg-slate-800 rounded w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredRooms.length === 0 ? (
          /* Empty Search / Filter State */
          <div className="glass-card p-12 rounded-3xl text-center max-w-md mx-auto my-8">
            <Compass className="w-10 h-10 text-slate-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white mb-1">No rooms found</h3>
            <p className="text-xs text-slate-400">
              {filterType === 'live'
                ? 'No rooms currently have live users chatting right now. Join any room to ignite the conversation!'
                : 'No chat rooms matched your search criteria. Try a different query.'}
            </p>
            {filterType !== 'all' && (
              <button
                onClick={() => setFilterType('all')}
                className="mt-4 px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs font-semibold text-slate-200 transition-all"
              >
                Show All Rooms
              </button>
            )}
          </div>
        ) : (
          /* Rooms Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map((room) => {
              const isLoading = actionLoadingId === room.id;
              const liveCount = getRoomLiveCount(room.id, room.live_count);
              const liveUsers = getRoomActiveUsers(room.id, room.active_users);

              return (
                <div
                  key={room.id}
                  className={`glass-card p-6 rounded-2xl border transition-all flex flex-col justify-between ${liveCount > 0
                    ? 'border-emerald-500/30 hover:border-emerald-500/50 shadow-lg shadow-emerald-950/20'
                    : 'border-white/[0.08] hover:border-violet-500/30'
                    }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <h3 className="text-lg font-bold text-white tracking-tight">
                        #{room.name}
                      </h3>

                      {/* Prominent Live Indicator Badge */}
                      {liveCount > 0 ? (
                        <div
                          title={`Active users right now: ${liveUsers.join(', ')}`}
                          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-sm shadow-emerald-500/25"
                        >
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span>{liveCount} Live Now</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-slate-900/60 border border-white/[0.06] text-slate-400 text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                          <span>0 Live</span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed min-h-[2.5rem] mb-4">
                      {room.description || 'Open public chat room for community discussions.'}
                    </p>

                    {/* Active live users banner inside the card if people are currently chatting */}
                    {liveUsers.length > 0 && (
                      <div className="mb-4 p-2.5 rounded-xl bg-slate-950/70 border border-emerald-500/20 flex items-center justify-between text-xs">
                        <span className="text-slate-400 text-[11px] flex items-center space-x-1">
                          <Activity className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Currently Active:</span>
                        </span>
                        <span className="font-mono text-emerald-300 font-semibold text-[11px] truncate max-w-[150px]">
                          {liveUsers.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                      <span className="flex items-center space-x-1">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>{room.members_count} members</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <MessageSquare className="w-3 h-3 text-slate-400" />
                        <span>{room.messages_count || 0} msgs</span>
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {room.is_member ? (
                        <>
                          <button
                            id={`leave-room-btn-${room.id}`}
                            onClick={() => handleLeave(room)}
                            disabled={isLoading}
                            className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all disabled:opacity-50"
                          >
                            Leave
                          </button>
                          <button
                            id={`enter-room-btn-${room.id}`}
                            onClick={() => onNavigate('chat', room.id)}
                            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/25 transition-all"
                          >
                            <span>Enter</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          id={`join-room-btn-${room.id}`}
                          onClick={() => handleJoin(room)}
                          disabled={isLoading}
                          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-violet-600 hover:text-white text-slate-200 text-xs font-semibold border border-white/10 hover:border-violet-500 transition-all disabled:opacity-50"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          <span>{isLoading ? 'Joining...' : 'Join Room'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

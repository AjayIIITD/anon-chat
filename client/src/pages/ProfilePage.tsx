import React, { useState } from 'react';
import { 
  Sparkles, 
  Calendar, 
  Compass, 
  LogOut, 
  ShieldCheck, 
  Lock, 
  ArrowRight,
  GraduationCap,
  CheckCircle2,
  Mail
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ProfilePageProps {
  onNavigate: (tab: string, roomId?: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
  const { user, openLogoutModal, updatePreferences } = useAuth();
  const [editingPrefs, setEditingPrefs] = useState(false);
  const [vibe, setVibe] = useState(user?.preferences?.vibe || 'chill');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!user) return null;

  const handleSavePreferences = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const updated = {
        ...user.preferences,
        vibe,
      };
      await updatePreferences(updated);
      setEditingPrefs(false);
      setMessage('Preferences updated successfully.');
    } catch {
      setMessage('Failed to update preferences.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr || 'Unknown';
    }
  };

  const isIIITDStudent = user.email?.toLowerCase().endsWith('iiitd.ac.in');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Personal Account & Persona
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Your persistent account credentials and public anonymous identity
        </p>
      </div>

      {message && (
        <div className="mb-6 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Anonymous Persona Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-white/10 text-center relative overflow-hidden">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 p-[1.5px] mx-auto mb-4 shadow-xl shadow-violet-600/25">
              <div className="w-full h-full bg-[#0b0f19] rounded-[14.5px] flex items-center justify-center font-mono text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-cyan-300">
                {user.anonymous_username.charAt(0).toUpperCase()}
              </div>
            </div>

            <div className="space-y-1 mb-4">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                Public Pseudonym in Rooms
              </span>
              <h2 className="font-mono text-xl font-bold text-white tracking-wide">
                {user.anonymous_username}
              </h2>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20 uppercase tracking-widest">
                {user.role}
              </span>
            </div>

            {/* Permanent Locked Anonymous Name Indicator */}
            <div className="pt-2">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/[0.08] text-[11px] text-slate-300 font-medium">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Permanent Anonymous Identity</span>
              </span>
            </div>
          </div>

          {/* Privacy Seal */}
          <div className="glass-card p-5 rounded-2xl border border-emerald-500/20 text-xs text-slate-300 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Zero-Leak Room Isolation</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Other students and room participants only ever see <span className="text-cyan-300 font-mono font-semibold">{user.anonymous_username}</span>. Your real email and credentials are never transmitted over room APIs.
            </p>
          </div>
        </div>

        {/* Right Column: Personal Authentication Details & Preferences */}
        <div className="md:col-span-2 space-y-6">
          {/* PERSONAL AUTHENTICATION CREDENTIALS (Visible strictly to user) */}
          <div className="glass-panel p-6 rounded-3xl border border-cyan-500/30 shadow-lg shadow-cyan-950/20 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Personal Authentication Account
                  </h3>
                  <p className="text-xs text-slate-400">
                    Your institutional sign-in data stored persistently
                  </p>
                </div>
              </div>

              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-mono">
                Private To You
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/[0.08] space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-xs text-slate-400 flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Student Email Address:</span>
                </span>
                <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/40 px-2.5 py-1 rounded-lg border border-cyan-500/20">
                  {user.email || 'None on record'}
                </span>
              </div>

              {/* Date of Birth (DOB) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1.5 border-t border-white/[0.06]">
                <span className="text-xs text-slate-400 flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-violet-400" />
                  <span>Date of Birth (DOB):</span>
                </span>
                <span className="text-xs font-mono font-semibold text-slate-200 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.08]">
                  {user.dob ? formatDate(user.dob) : (user.preferences?.dob ? formatDate(user.preferences.dob) : 'Not specified')}
                </span>
              </div>

              {isIIITDStudent ? (
                <div className="flex items-center space-x-2 text-xs text-emerald-400 font-semibold pt-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Verified IIIT-Delhi Institutional Student (@iiitd.ac.in)</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-xs text-violet-300 font-medium pt-1">
                  <Lock className="w-4 h-4 text-violet-400 shrink-0" />
                  <span>Persistent Authentication Account</span>
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-violet-950/20 border border-violet-500/20 text-xs text-slate-300 space-y-1">
              <span className="text-violet-300 font-bold block text-[11px]">Permanent Persistence:</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                When you log in next time with this account (<strong className="text-slate-200">{user.email}</strong>), your persistent persona (<strong className="text-cyan-300 font-mono">{user.anonymous_username}</strong>), preferences, joined rooms, and conversation messages remain 100% the same.
              </p>
            </div>
          </div>

          {/* Persona Preferences */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Persona Attributes</h3>
                <p className="text-xs text-slate-400">Preferences used to generate anonymous identity</p>
              </div>

              <button
                onClick={() => setEditingPrefs(!editingPrefs)}
                className="text-xs text-violet-400 hover:text-violet-300 font-semibold"
              >
                {editingPrefs ? 'Cancel' : 'Edit'}
              </button>
            </div>

            <div className="space-y-4">
              {/* Vibe */}
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Vibe Tone
                </span>
                {editingPrefs ? (
                  <select
                    value={vibe}
                    onChange={(e) => setVibe(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500"
                  >
                    <option value="chill">Chill & Mellow</option>
                    <option value="mystic">Mystic & Nocturnal</option>
                    <option value="curious">Curious & Inquisitive</option>
                    <option value="energetic">Energetic & Vibrant</option>
                    <option value="philosophical">Philosophical & Stoic</option>
                    <option value="creative">Creative & Artistic</option>
                    <option value="rebel">Rebel & Cyberpunk</option>
                  </select>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-lg bg-slate-900 border border-white/[0.08] text-xs font-medium text-slate-200 capitalize">
                    {user.preferences?.vibe || 'Chill'}
                  </span>
                )}
              </div>

              {/* Interests */}
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Selected Interests
                </span>
                <div className="flex flex-wrap gap-2">
                  {(user.preferences?.interests || ['Tech', 'Campus', 'Programming']).map((item: string) => (
                    <span
                      key={item}
                      className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-cyan-500/20 text-cyan-300 text-xs font-medium"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {editingPrefs && (
                <div className="pt-2">
                  <button
                    onClick={handleSavePreferences}
                    disabled={loading}
                    className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/20"
                  >
                    {loading ? 'Saving...' : 'Save Attributes'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Account Details & Joined Rooms */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-5">
            <h3 className="text-base font-bold text-white tracking-tight border-b border-white/[0.07] pb-3">
              Room Memberships & History
            </h3>

            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <Calendar className="w-4 h-4 text-violet-400" />
              <span>Identity registered on {formatDate(user.created_at)}</span>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-3">
                Joined Chat Rooms ({user.joined_rooms?.length || 0})
              </span>

              {user.joined_rooms && user.joined_rooms.length > 0 ? (
                <div className="space-y-2">
                  {user.joined_rooms.map((room) => (
                    <div
                      key={room.id}
                      className="p-3 rounded-xl bg-slate-900/40 border border-white/[0.05] flex items-center justify-between hover:border-violet-500/30 transition-all"
                    >
                      <div className="flex items-center space-x-2">
                        <Compass className="w-4 h-4 text-violet-400" />
                        <span className="text-xs font-bold text-white font-mono">#{room.name}</span>
                      </div>

                      <button
                        onClick={() => onNavigate('chat', room.id)}
                        className="flex items-center space-x-1 text-xs text-violet-400 hover:text-violet-300 font-semibold"
                      >
                        <span>Open Chat</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">You have not joined any specific rooms yet.</p>
              )}
            </div>
          </div>

          {/* Sign Out Card */}
          <div className="flex justify-end pt-2">
            <button
              id="profile-logout-btn"
              onClick={openLogoutModal}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-xs font-semibold transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out of Session</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

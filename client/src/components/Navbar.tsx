import React from 'react';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Shield, User as UserIcon, LogOut, Compass, Sparkles } from 'lucide-react';

interface NavbarProps {
  currentTab?: string;
  onNavigate: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onNavigate }) => {
  const { user, openLogoutModal } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/[0.07] bg-[#070a12]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div 
          onClick={() => onNavigate(user ? 'dashboard' : 'landing')}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-500 p-[1px] shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-all duration-300">
            <div className="w-full h-full bg-[#0b0f19] rounded-[11px] flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-violet-400 group-hover:scale-110 transition-transform duration-300" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                AnonChat
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
                Incognito
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Zero-leak anonymous rooms
            </span>
          </div>
        </div>

        {/* Navigation / Actions */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {user ? (
            <>
              {/* Dashboard / Rooms link */}
              <button
                id="nav-dashboard-btn"
                onClick={() => onNavigate('dashboard')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  currentTab === 'dashboard'
                    ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span className="hidden sm:inline">Rooms</span>
              </button>

              {/* Admin link (Only if admin role) */}
              {user.role === 'admin' && (
                <button
                  id="nav-admin-btn"
                  onClick={() => onNavigate('admin')}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    currentTab === 'admin'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10'
                      : 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/20'
                  }`}
                >
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">Admin Portal</span>
                </button>
              )}

              {/* User Anonymous Pill */}
              <button
                id="nav-profile-btn"
                onClick={() => onNavigate('profile')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border transition-all ${
                  currentTab === 'profile'
                    ? 'bg-violet-600/20 border-violet-500/50 text-white'
                    : 'bg-white/[0.03] border-white/10 hover:border-violet-500/30 text-slate-300 hover:text-white'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-violet-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                  {user.anonymous_username.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="text-xs font-semibold tracking-wide">
                    {user.anonymous_username}
                  </span>
                </div>
              </button>

              {/* Logout */}
              <button
                id="nav-logout-btn"
                onClick={openLogoutModal}
                title="Log out"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                id="nav-login-btn"
                onClick={() => onNavigate('login')}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all"
              >
                Log In
              </button>

              <button
                id="nav-signup-btn"
                onClick={() => onNavigate('signup')}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-600/25 hover:shadow-violet-600/40 transition-all"
              >
                <Sparkles className="w-4 h-4 text-violet-200" />
                <span>Get Anonymous ID</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

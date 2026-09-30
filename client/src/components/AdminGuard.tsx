import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';

interface AdminGuardProps {
  children: React.ReactNode;
  onNavigateHome: () => void;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ children, onNavigateHome }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
        <p className="text-slate-400 text-sm animate-pulse">Verifying credentials and security clearing...</p>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full glass-panel p-8 rounded-2xl border border-rose-500/20 shadow-2xl shadow-rose-950/20 text-center relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-6 shadow-inner">
            <ShieldAlert className="w-8 h-8 text-rose-400" />
          </div>

          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20 mb-3">
            <Lock className="w-3 h-3" />
            <span>403 Forbidden — Restricted Zone</span>
          </span>

          <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
            Access Denied
          </h2>

          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            The administrator command portal is strictly restricted to verified system administrators. Your account (<span className="text-violet-300 font-semibold">{user ? user.anonymous_username : 'Guest'}</span>) does not possess administrative clearance.
          </p>

          <div className="space-y-3">
            <button
              id="admin-forbidden-back-btn"
              onClick={onNavigateHome}
              className="w-full flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-violet-600/20"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

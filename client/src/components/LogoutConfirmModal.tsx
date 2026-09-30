import React, { useEffect } from 'react';
import { LogOut, X, ShieldCheck, User as UserIcon, Sparkles } from 'lucide-react';
import { User } from '../types';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  user: User | null;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  user,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle ambient rose glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          id="logout-modal-close-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          title="Cancel"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Alert Icon & Heading */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500/20 via-rose-600/10 to-orange-500/20 border border-rose-500/30 flex items-center justify-center mx-auto mb-4 text-rose-400 shadow-lg shadow-rose-950/40">
            <LogOut className="w-7 h-7" />
          </div>
          <h3 className="text-2xl font-bold text-white tracking-tight">
            Log Out of AnonChat?
          </h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Are you sure you want to end your active incognito session?
          </p>
        </div>

        {/* Active Session Summary Card */}
        {user && (
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/[0.08] space-y-3 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 flex items-center space-x-1.5 font-medium">
                <UserIcon className="w-3.5 h-3.5 text-violet-400" />
                <span>Active Persona:</span>
              </span>
              <span className="text-xs font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-cyan-300 bg-[#0c101c] px-2.5 py-1 rounded-lg border border-violet-500/20">
                {user.anonymous_username}
              </span>
            </div>

            {user.email && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/[0.05]">
                <span className="text-slate-400">Account:</span>
                <span className="text-slate-300 font-mono text-[11px] truncate max-w-[200px]">
                  {user.email}
                </span>
              </div>
            )}

            <div className="flex items-start space-x-2 pt-2 border-t border-white/[0.05] text-[11px] text-emerald-400/90 leading-relaxed">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>
                Your persona, joined rooms, preferences, and conversations are safely saved. You will resume right where you left off when you log in again.
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            id="logout-cancel-btn"
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white font-semibold text-xs transition-all"
          >
            Stay Logged In
          </button>

          <button
            id="logout-confirm-btn"
            type="button"
            onClick={onConfirm}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 hover:shadow-rose-600/50 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Yes, Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

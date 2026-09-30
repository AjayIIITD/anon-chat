import React, { useState } from 'react';
import { X, RefreshCw, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface RegenerateUsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RegenerateUsernameModal: React.FC<RegenerateUsernameModalProps> = ({ isOpen, onClose }) => {
  const { user, regenerateUsername } = useAuth();
  const [loading, setLoading] = useState(false);
  const [newUsername, setNewUsername] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleRegenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const generated = await regenerateUsername();
      setNewUsername(generated);
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate username.');
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    setNewUsername(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md glass-panel p-6 rounded-2xl border border-white/10 shadow-2xl relative">
        <button
          onClick={handleDone}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Regenerate Anonymous Identity</h3>
            <p className="text-xs text-slate-400">Generate a fresh persona based on your preferences</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center space-x-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {newUsername ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-1">Your new persistent anonymous identity is:</p>
              <div className="p-4 rounded-xl bg-slate-950/70 border border-violet-500/30 font-mono text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-indigo-200 to-cyan-300">
                {newUsername}
              </div>
            </div>

            <p className="text-xs text-slate-400">
              This new identity will be displayed in all rooms while keeping your past chat history intact.
            </p>

            <button
              id="confirm-regenerated-username-btn"
              onClick={handleDone}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-violet-600/25"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-950/50 border border-white/[0.07]">
              <span className="text-xs text-slate-400 block mb-1">Current Anonymous Identity:</span>
              <span className="font-mono text-base font-bold text-white block">
                {user.anonymous_username}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Regenerating will synthesize a brand new, strictly unique username combining your vibe and interest selections. Past messages you sent will seamlessly reflect your new identity.
            </p>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={handleDone}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                Cancel
              </button>
              <button
                id="roll-new-username-btn"
                type="button"
                onClick={handleRegenerate}
                disabled={loading}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-violet-600/25 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-violet-200" />
                <span>{loading ? 'Synthesizing...' : 'Roll New Identity'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, AlertCircle, Shield, User, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  onNavigate: (tab: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide your authentication email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(email.trim(), password);
      onNavigate('dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const autofillDemoUser = () => {
    setEmail('quietpixel@anonchat.internal');
    setPassword('UserPassword123!');
    setError(null);
  };

  const autofillAdmin = () => {
    setEmail('admin@anonchat.internal');
    setPassword('AdminPassword123!');
    setError(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 relative">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[450px] bg-gradient-to-tr from-violet-600/10 via-indigo-600/10 to-cyan-500/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="w-full max-w-md glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 shadow-2xl relative">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 p-[1px] mx-auto mb-3 shadow-lg shadow-violet-500/20">
            <div className="w-full h-full bg-[#0b0f19] rounded-[15px] flex items-center justify-center">
              <Lock className="w-5 h-5 text-violet-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Log In to AnonChat
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Access your persistent anonymous persona and conversations
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center space-x-2.5 text-rose-300 text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Authentication Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                id="login-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                id="login-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your secret password"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
              />
            </div>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-violet-600/25 transition-all disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Enter AnonChat</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Testing Seeded Accounts Section */}
        <div className="mt-6 pt-6 border-t border-white/[0.07]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2 text-center">
            Quick Test Autofill
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={autofillDemoUser}
              className="flex items-center justify-center space-x-1.5 p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs text-slate-300 hover:text-white transition-all"
            >
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>Demo User</span>
            </button>
            <button
              type="button"
              onClick={autofillAdmin}
              className="flex items-center justify-center space-x-1.5 p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-xs text-amber-300 hover:text-amber-200 transition-all"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin User</span>
            </button>
          </div>
        </div>

        {/* Footnote */}
        <div className="mt-6 text-center text-xs text-slate-400">
          <span>Need an anonymous persona? </span>
          <button
            id="login-goto-signup-btn"
            type="button"
            onClick={() => onNavigate('signup')}
            className="text-violet-400 hover:text-violet-300 font-semibold underline"
          >
            Sign up anonymously
          </button>
        </div>
      </div>
    </div>
  );
};

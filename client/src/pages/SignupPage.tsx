import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Mail, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  RefreshCw, 
  Check, 
  AlertCircle,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { UserPreferences } from '../types';

interface SignupPageProps {
  onNavigate: (tab: string) => void;
}

const VIBE_OPTIONS = [
  { id: 'chill', label: 'Chill & Mellow', desc: 'Calm, relaxed, thoughtful' },
  { id: 'mystic', label: 'Mystic & Nocturnal', desc: 'Deep, shadowy, midnight thoughts' },
  { id: 'curious', label: 'Curious & Inquisitive', desc: 'Always wondering and questioning' },
  { id: 'energetic', label: 'Energetic & Vibrant', desc: 'Electric, fast-paced, enthusiastic' },
  { id: 'philosophical', label: 'Philosophical', desc: 'Stoic, deep thinker, abstract' },
  { id: 'creative', label: 'Creative & Artistic', desc: 'Visual, expressive, imaginative' },
  { id: 'rebel', label: 'Rebel & Cyberpunk', desc: 'Rogue, witty, tech-anarchist' },
];

const INTEREST_OPTIONS = [
  'Programming', 'Photography', 'Gaming', 'Coffee', 'Nature',
  'Music', 'Books', 'Philosophy', 'Space', 'Art', 'Cybersecurity', 'AI'
];

export const SignupPage: React.FC<SignupPageProps> = ({ onNavigate }) => {
  const { signup } = useAuth();

  const [step, setStep] = useState<number>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Preferences
  const [vibe, setVibe] = useState('chill');
  const [interests, setInterests] = useState<string[]>(['Programming', 'Coffee']);
  const [conversationStyle, setConversationStyle] = useState('Casual & relaxed');
  
  // Generated Persona Preview
  const [previewUsername, setPreviewUsername] = useState<string>('QuietPixel42');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleInterest = (item: string) => {
    if (interests.includes(item)) {
      if (interests.length > 1) {
        setInterests(interests.filter(i => i !== item));
      }
    } else {
      if (interests.length < 5) {
        setInterests([...interests, item]);
      }
    }
  };

  // Generate identity preview on step 3 transition
  const fetchPreview = async () => {
    setIsGenerating(true);
    try {
      const prefs: UserPreferences = {
        vibe,
        interests,
        topics: interests,
        conversationStyle,
      };
      const res = await api.previewUsername(prefs);
      setPreviewUsername(res.anonymous_username);
    } catch {
      // Fallback
      setPreviewUsername(`Anon${vibe.charAt(0).toUpperCase() + vibe.slice(1)}${Math.floor(10 + Math.random() * 89)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setStep(2);
  };

  const handleStep2Next = async () => {
    setStep(3);
    await fetchPreview();
  };

  const handleFinalSignup = async () => {
    setLoading(true);
    setError(null);

    try {
      const preferences: UserPreferences = {
        vibe,
        interests,
        topics: interests,
        conversationStyle,
      };

      await signup({
        email,
        password,
        preferences,
        chosen_username: previewUsername,
      });

      // Navigate to dashboard
      onNavigate('dashboard');
    } catch (err: any) {
      setError(err.message || 'Account registration failed.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 relative">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] bg-gradient-to-tr from-violet-600/10 via-indigo-600/10 to-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-xl glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 shadow-2xl relative">
        {/* Step Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
            <span className="font-semibold uppercase tracking-wider text-violet-400">
              Step {step} of 3
            </span>
            <span>
              {step === 1 && 'Account Security'}
              {step === 2 && 'Vibe & Interests'}
              {step === 3 && 'Your Anonymous Persona'}
            </span>
          </div>

          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-500"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center space-x-3 text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Account Security */}
        {step === 1 && (
          <form onSubmit={handleStep1Next} className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight mb-1">
                Create Secure Account
              </h2>
              <p className="text-xs text-slate-400">
                Your email is used for persistent recovery only.
              </p>
            </div>

            {/* Privacy Callout Banner */}
            <div className="p-3.5 rounded-xl bg-violet-950/30 border border-violet-500/20 flex items-start space-x-3 text-xs text-violet-200">
              <EyeOff className="w-4 h-4 shrink-0 text-violet-400 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="text-white">Strict Privacy:</strong> Your real email and identity details will <span className="underline decoration-violet-400">NEVER</span> be visible to other room members or public chats.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  id="signup-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    id="signup-password-input"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    id="signup-confirm-password-input"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              id="signup-step1-next-btn"
              type="submit"
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-violet-600/25 transition-all mt-4"
            >
              <span>Continue to Persona Preferences</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-center text-xs text-slate-400 pt-2">
              Already have an anonymous account?{' '}
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="text-violet-400 hover:text-violet-300 font-semibold underline"
              >
                Log in here
              </button>
            </p>
          </form>
        )}

        {/* STEP 2: Persona Preferences */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight mb-1">
                Select Your Vibe
              </h2>
              <p className="text-xs text-slate-400">
                These preferences sculpt your unique anonymous identity and username.
              </p>
            </div>

            {/* Vibe Grid */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                Persona Vibe
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {VIBE_OPTIONS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVibe(v.id)}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      vibe === v.id
                        ? 'bg-violet-600/20 border-violet-500 text-white shadow-sm shadow-violet-500/20'
                        : 'bg-slate-900/40 border-white/[0.06] text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{v.label}</span>
                      {vibe === v.id && <Check className="w-3.5 h-3.5 text-violet-400" />}
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5">{v.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Interests Tag Clouds */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                Select Interests (1 to 5)
              </label>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((interest) => {
                  const selected = interests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        selected
                          ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200'
                          : 'bg-slate-900/50 border-white/[0.08] text-slate-400 hover:text-white'
                      }`}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                id="signup-step2-next-btn"
                type="button"
                onClick={handleStep2Next}
                className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-violet-600/25 transition-all"
              >
                <span>Synthesize Persona</span>
                <Sparkles className="w-4 h-4 text-violet-200" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Identity Generation & Reveal */}
        {step === 3 && (
          <div className="space-y-6 text-center">
            <div>
              <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest block mb-1">
                Identity Synthesizer
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Your Anonymous Identity
              </h2>
            </div>

            {/* Persona Holographic Card */}
            <div className="p-8 rounded-2xl glass-card border border-violet-500/30 shadow-2xl relative overflow-hidden group">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-violet-500/20 rounded-full blur-2xl pointer-events-none" />

              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 p-[1px] mx-auto mb-4 shadow-lg shadow-violet-500/30">
                <div className="w-full h-full bg-[#0a0e1a] rounded-[15px] flex items-center justify-center font-mono text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-cyan-300">
                  {previewUsername ? previewUsername.charAt(0) : '?'}
                </div>
              </div>

              <div className="space-y-1 mb-4">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                  Assigned Anonymous Persona
                </span>
                <div className="font-mono text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-indigo-200 to-cyan-300 tracking-wide">
                  {isGenerating ? 'Synthesizing...' : previewUsername}
                </div>
              </div>

              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed border-t border-white/[0.07] pt-3">
                Nobody in the chat will ever know your real identity. This persona is permanently bound to your account.
              </p>

              <button
                id="signup-reroll-btn"
                type="button"
                onClick={fetchPreview}
                disabled={isGenerating}
                className="mt-4 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>Roll Different Name</span>
              </button>
            </div>

            {/* Security Confirmation Notice */}
            <div className="flex items-center justify-center space-x-2 text-xs text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>PostgreSQL Unique Identity Certified</span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Change Preferences</span>
              </button>

              <button
                id="signup-enter-platform-btn"
                type="button"
                disabled={loading}
                onClick={handleFinalSignup}
                className="flex items-center space-x-2 px-8 py-3 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-bold text-sm shadow-xl shadow-violet-600/30 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span>Creating Account...</span>
                ) : (
                  <>
                    <span>Enter Platform</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

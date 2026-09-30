import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, AlertTriangle, AlertCircle, X, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  onNavigate: (tab: string) => void;
}

interface LoginMistake {
  title: string;
  message: string;
  field: 'email' | 'password' | 'all' | 'general';
  suggestion?: 'signup';
  mistakeType?: string;
  emailHint?: string;
  passwordHint?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mistake, setMistake] = useState<LoginMistake | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();

    // 1. Mistake: Both fields are empty
    if (!cleanEmail && !password) {
      setMistake({
        title: 'Empty Credentials',
        message: 'Both the student email and password fields are empty. Please fill in your credentials to log in.',
        field: 'all',
        mistakeType: 'empty_form',
        emailHint: 'Please enter your IIIT-Delhi email',
        passwordHint: 'Please enter your password',
      });
      return;
    }

    // 2. Mistake: Email is empty
    if (!cleanEmail) {
      setMistake({
        title: 'Email Field Missing',
        message: 'You left the email field blank. Please enter your IIIT-Delhi student email address (e.g. rollno@iiitd.ac.in).',
        field: 'email',
        mistakeType: 'empty_email',
        emailHint: 'Email address cannot be empty',
      });
      return;
    }

    const lowerEmail = cleanEmail.toLowerCase();
    const isSpecialLogin = lowerEmail === 'admin' || lowerEmail === 'admin@admin.com' || lowerEmail === 'apexsentinel';

    if (!isSpecialLogin) {
      // 3. Mistake: Email format lacks '@'
      if (!cleanEmail.includes('@')) {
        setMistake({
          title: 'Invalid Email Format',
          message: `The email "${cleanEmail}" is missing an "@" symbol. Institutional email format must be rollno@iiitd.ac.in.`,
          field: 'email',
          mistakeType: 'invalid_format',
          emailHint: 'Missing "@" symbol in email',
        });
        return;
      }

      // 4. Mistake: Domain is not @iiitd.ac.in
      const isIIITD = lowerEmail.endsWith('@iiitd.ac.in') || lowerEmail.endsWith('.iiitd.ac.in');
      if (!isIIITD) {
        const enteredDomain = lowerEmail.includes('@') ? '@' + lowerEmail.split('@')[1] : lowerEmail;
        setMistake({
          title: 'Domain Mistake',
          message: `You entered "${cleanEmail}" with domain "${enteredDomain}". Only official IIIT-Delhi student accounts ending with @iiitd.ac.in are allowed.`,
          field: 'email',
          mistakeType: 'wrong_domain',
          emailHint: `Domain "${enteredDomain}" is not permitted. Must end with @iiitd.ac.in`,
        });
        return;
      }
    }

    // 5. Mistake: Password is empty
    if (!password) {
      setMistake({
        title: 'Password Field Missing',
        message: 'You have not entered your password. Please enter your account password to proceed.',
        field: 'password',
        mistakeType: 'empty_password',
        passwordHint: 'Password is required to sign in',
      });
      return;
    }

    setLoading(true);
    setMistake(null);

    try {
      await login(lowerEmail, password);
      onNavigate('dashboard');
    } catch (err: any) {
      const mistakeType = err.mistakeType || err.data?.mistakeType || 'login_error';
      const field = (err.field || err.data?.field || 'general') as LoginMistake['field'];
      const suggestion = (err.suggestion || err.data?.suggestion) as LoginMistake['suggestion'];

      let title = 'Login Mistake Detected';
      let emailHint: string | undefined;
      let passwordHint: string | undefined;

      if (mistakeType === 'unregistered_email') {
        title = 'Account Not Found';
        emailHint = 'No account with this email. Check for roll number typos or sign up.';
      } else if (mistakeType === 'incorrect_password') {
        title = 'Incorrect Password';
        passwordHint = 'Password does not match. Check Caps Lock or re-type carefully.';
      } else if (mistakeType === 'wrong_domain') {
        title = 'Domain Error';
        emailHint = 'Must end with @iiitd.ac.in';
      } else if (mistakeType === 'suspended') {
        title = 'Account Suspended';
      }

      setMistake({
        title,
        message: err.message || 'Login failed. Please check your credentials.',
        field,
        suggestion: suggestion === 'signup' ? 'signup' : undefined,
        mistakeType,
        emailHint,
        passwordHint,
      });
    } finally {
      setLoading(false);
    }
  };

  const isEmailMistake = mistake?.field === 'email' || mistake?.field === 'all';
  const isPasswordMistake = mistake?.field === 'password' || mistake?.field === 'all';

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 relative">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[450px] bg-gradient-to-tr from-violet-600/10 via-indigo-600/10 to-cyan-500/10 rounded-full blur-[130px] pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 shadow-2xl relative">
        <div className="text-center mb-6">
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

        {/* DETAILED MISTAKE FEEDBACK BOX */}
        {mistake && (
          <div
            id="login-mistake-alert"
            className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs shadow-lg shadow-rose-950/40 animate-fade-in relative"
          >
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0 mt-0.5 text-rose-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center space-x-2 mb-1 flex-wrap gap-y-1">
                  <span className="font-bold text-rose-200 uppercase tracking-wider text-[11px]">
                    {mistake.title}
                  </span>
                  {mistake.field && mistake.field !== 'general' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono font-semibold">
                      Mistake in {mistake.field}
                    </span>
                  )}
                </div>
                <p className="text-slate-300 text-xs leading-relaxed font-normal">
                  {mistake.message}
                </p>

                {/* Direct Action Suggestion: Create account if email unregistered */}
                {mistake.suggestion === 'signup' && (
                  <div className="mt-3 pt-2.5 border-t border-rose-500/20 flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Need to create an account?</span>
                    <button
                      id="mistake-goto-signup-btn"
                      type="button"
                      onClick={() => onNavigate('signup')}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-white font-semibold text-xs border border-rose-500/30 transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Sign Up Here</span>
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setMistake(null)}
                aria-label="Dismiss mistake"
                className="absolute top-3 right-3 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                IIIT-Delhi Student Email
              </label>
              <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                @iiitd.ac.in
              </span>
            </div>
            <div className="relative">
              <Mail className={`w-4 h-4 absolute left-3.5 top-3.5 transition-colors ${
                isEmailMistake ? 'text-rose-400' : 'text-slate-400'
              }`} />
              <input
                id="login-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (mistake?.field === 'email' || mistake?.field === 'all') {
                    setMistake(null);
                  }
                }}
                placeholder="rollno@iiitd.ac.in"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-white placeholder-slate-500 text-sm font-mono transition-all ${
                  isEmailMistake
                    ? 'bg-rose-950/20 border border-rose-500/80 ring-2 ring-rose-500/30 focus:outline-none focus:border-rose-400'
                    : 'bg-slate-900/60 border border-white/10 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400'
                }`}
              />
            </div>
            {isEmailMistake && mistake?.emailHint && (
              <div className="mt-1.5 flex items-center space-x-1.5 text-[11px] text-rose-400 animate-fade-in font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{mistake.emailHint}</span>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className={`w-4 h-4 absolute left-3.5 top-3.5 transition-colors ${
                isPasswordMistake ? 'text-rose-400' : 'text-slate-400'
              }`} />
              <input
                id="login-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (mistake?.field === 'password' || mistake?.field === 'all') {
                    setMistake(null);
                  }
                }}
                placeholder="Your secret password"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-white placeholder-slate-500 text-sm transition-all ${
                  isPasswordMistake
                    ? 'bg-rose-950/20 border border-rose-500/80 ring-2 ring-rose-500/30 focus:outline-none focus:border-rose-400'
                    : 'bg-slate-900/60 border border-white/10 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500'
                }`}
              />
            </div>
            {isPasswordMistake && mistake?.passwordHint && (
              <div className="mt-1.5 flex items-center space-x-1.5 text-[11px] text-rose-400 animate-fade-in font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{mistake.passwordHint}</span>
              </div>
            )}
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

        {/* Footnote */}
        <div className="mt-6 text-center text-xs text-slate-400 border-t border-white/[0.07] pt-4">
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

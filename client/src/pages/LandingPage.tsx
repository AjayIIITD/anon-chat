import React from 'react';
import { 
  ShieldCheck, 
  MessageSquare, 
  Sparkles, 
  EyeOff, 
  Database, 
  Zap, 
  ArrowRight, 
  Users, 
  Lock,
  Code2,
  Camera,
  Moon,
  Gamepad2
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (tab: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-between overflow-hidden">
      {/* Background ambient light gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-violet-600/15 via-indigo-600/10 to-cyan-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Hero Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-16 text-center">
        {/* Security Badge */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full glass-card border-violet-500/30 text-violet-300 text-xs font-semibold mb-8 animate-pulse-glow shadow-sm">
          <EyeOff className="w-3.5 h-3.5 text-violet-400" />
          <span>Strict Zero-Identity Leak Guarantee</span>
        </div>

        {/* Main Title */}
        <h1 className="text-3xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-4 sm:mb-6 leading-[1.15] sm:leading-[1.1]">
          Speak Freely. <br />
          <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
            Remain Truly Anonymous.
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-sm sm:text-lg text-slate-300 mb-8 sm:mb-10 leading-relaxed font-normal px-2">
          A modern, persistent anonymous chatting platform. Connect in real-time topic rooms with an AI-synthesized persona based on your vibe. Your email and real identity are cryptographically locked and never revealed to anyone.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-12 sm:mb-16 w-full max-w-md mx-auto sm:max-w-none">
          <button
            id="hero-start-chatting-btn"
            onClick={() => onNavigate('signup')}
            className="w-full sm:w-auto flex items-center justify-center space-x-2.5 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-bold text-sm sm:text-base shadow-xl shadow-violet-600/30 hover:shadow-violet-600/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          >
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-violet-200" />
            <span>Start Chatting Anonymously</span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-violet-200" />
          </button>

          <button
            id="hero-login-btn"
            onClick={() => onNavigate('login')}
            className="w-full sm:w-auto px-6 sm:px-7 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl glass-card hover:bg-white/[0.08] text-slate-200 font-semibold text-sm sm:text-base border border-white/10 hover:border-violet-500/40 transition-all duration-300"
          >
            Existing Member? Log In
          </button>
        </div>

        {/* Live Anonymous Persona Preview Card */}
        <div className="max-w-lg mx-auto glass-panel p-5 rounded-2xl border border-white/10 shadow-2xl relative">
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-white/[0.07] pb-3 mb-4">
            <span className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-mono text-emerald-400 font-medium">Real-Time Room Stream</span>
            </span>
            <span className="font-mono text-slate-400">#Programming</span>
          </div>

          <div className="space-y-3 text-left">
            <div className="p-3 rounded-xl bg-slate-900/50 border border-white/[0.05]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-violet-400 font-mono">QuietPixel</span>
                <span className="text-[10px] text-slate-400">10:42 PM</span>
              </div>
              <p className="text-xs text-slate-200">hey, anyone here working with distributed event-driven systems?</p>
            </div>

            <div className="p-3 rounded-xl bg-violet-600/20 border border-violet-500/30 ml-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-cyan-300 font-mono">MidnightCoder42</span>
                <span className="text-[10px] text-violet-300/70">10:43 PM</span>
              </div>
              <p className="text-xs text-white">Yeah, building a real-time WebSocket broker with PostgreSQL right now!</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.07] flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center space-x-1">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Real identities completely hidden</span>
            </span>
            <span className="font-mono text-violet-400">PostgreSQL Verified</span>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-2xl glass-card-hover">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Cryptographic Privacy</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Your real email and authentication keys are isolated strictly in backend auth. Room members only ever see your anonymous persona.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl glass-card-hover">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Instant Real-Time Stream</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Powered by high-throughput WebSockets. Messages appear instantaneously without refreshing, with automatic reconnection resilience.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl glass-card-hover">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Full Database Persistence</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Log back in anytime. Your anonymous username, selected preferences, joined rooms, and conversation history are permanently saved.
            </p>
          </div>
        </div>
      </section>

      {/* Popular Rooms Showcase */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Curated Themed Rooms
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Jump into specialized rooms curated by platform administrators
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl glass-card flex items-center space-x-3">
            <Code2 className="w-5 h-5 text-violet-400" />
            <div className="text-left">
              <span className="text-sm font-semibold text-white block">Programming</span>
              <span className="text-[11px] text-slate-400">Code & design</span>
            </div>
          </div>

          <div className="p-4 rounded-xl glass-card flex items-center space-x-3">
            <Camera className="w-5 h-5 text-cyan-400" />
            <div className="text-left">
              <span className="text-sm font-semibold text-white block">Photography</span>
              <span className="text-[11px] text-slate-400">Visual aesthetics</span>
            </div>
          </div>

          <div className="p-4 rounded-xl glass-card flex items-center space-x-3">
            <Moon className="w-5 h-5 text-indigo-400" />
            <div className="text-left">
              <span className="text-sm font-semibold text-white block">Late Night Talks</span>
              <span className="text-[11px] text-slate-400">Midnight musings</span>
            </div>
          </div>

          <div className="p-4 rounded-xl glass-card flex items-center space-x-3">
            <Gamepad2 className="w-5 h-5 text-emerald-400" />
            <div className="text-left">
              <span className="text-sm font-semibold text-white block">Gaming</span>
              <span className="text-[11px] text-slate-400">Multiplayer banter</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.07] py-8 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Lock className="w-3.5 h-3.5 text-violet-400" />
            <span>AnonChat Platform — Cryptographically Private & Persistent</span>
          </div>
          <span>PostgreSQL Real-Time Architecture</span>
        </div>
      </footer>
    </div>
  );
};

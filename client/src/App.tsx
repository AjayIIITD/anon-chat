import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/DashboardPage';
import { ChatPage } from './pages/ChatPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  // Sync initial tab from pathname or auth state
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/chat/') || path.startsWith('/rooms/')) {
      const id = path.split('/')[2];
      if (id) {
        setActiveRoomId(id);
        setCurrentTab('chat');
        return;
      }
    }
    if (path === '/admin') {
      setCurrentTab('admin');
      return;
    }
    if (path === '/profile') {
      setCurrentTab('profile');
      return;
    }
    if (path === '/login') {
      setCurrentTab('login');
      return;
    }
    if (path === '/signup') {
      setCurrentTab('signup');
      return;
    }
    if (path === '/dashboard') {
      setCurrentTab('dashboard');
      return;
    }

    if (!loading) {
      if (user) {
        setCurrentTab('dashboard');
      } else {
        setCurrentTab('landing');
      }
    }
  }, [loading, user]);

  const navigateTo = (tab: string, roomId?: string) => {
    setCurrentTab(tab);
    if (roomId) {
      setActiveRoomId(roomId);
      window.history.pushState({}, '', `/chat/${roomId}`);
    } else {
      setActiveRoomId(null);
      window.history.pushState({}, '', `/${tab === 'landing' ? '' : tab}`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/chat/')) {
        const id = path.split('/')[2];
        setActiveRoomId(id);
        setCurrentTab('chat');
      } else if (path === '/admin') {
        setCurrentTab('admin');
      } else if (path === '/profile') {
        setCurrentTab('profile');
      } else if (path === '/login') {
        setCurrentTab('login');
      } else if (path === '/signup') {
        setCurrentTab('signup');
      } else if (path === '/dashboard') {
        setCurrentTab('dashboard');
      } else {
        setCurrentTab(user ? 'dashboard' : 'landing');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090e] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
        <p className="text-slate-400 text-xs font-mono tracking-wider animate-pulse">
          INITIALIZING SECURE SESSION...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col selection:bg-violet-500/30 selection:text-violet-200">
      <Navbar currentTab={currentTab} onNavigate={navigateTo} />

      <main className="flex-1">
        {currentTab === 'landing' && (
          <LandingPage onNavigate={navigateTo} />
        )}

        {currentTab === 'signup' && (
          <SignupPage onNavigate={navigateTo} />
        )}

        {currentTab === 'login' && (
          <LoginPage onNavigate={navigateTo} />
        )}

        {currentTab === 'dashboard' && (
          <DashboardPage onNavigate={navigateTo} />
        )}

        {currentTab === 'chat' && activeRoomId && (
          <ChatPage roomId={activeRoomId} onNavigate={navigateTo} />
        )}

        {currentTab === 'profile' && (
          <ProfilePage onNavigate={navigateTo} />
        )}

        {currentTab === 'admin' && (
          <AdminPage onNavigateHome={() => navigateTo('dashboard')} />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

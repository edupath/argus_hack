'use client';
import { useState } from 'react';
import { getAuth, signOut } from 'firebase/auth';
import { app } from '../lib/firebase';
import { useRouter } from 'next/navigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  pageTitle: string;
  user: any;
}

export default function DashboardLayout({ children, currentPage, pageTitle, user }: DashboardLayoutProps) {
  const auth = getAuth(app);
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'Application deadline approaching', time: '2 hours ago', read: false },
    { id: 2, text: 'New program matches found', time: '1 day ago', read: false },
  ]);

  const navigateTo = (view: string) => {
    switch (view) {
      case 'home':
        router.push('/');
        break;
      case 'profile':
        router.push('/profile');
        break;
      case 'applications':
        router.push('/applications');
        break;
      case 'search':
        router.push('/search');
        break;
      case 'settings':
        router.push('/settings');
        break;
    }
  };

  return (
    <div className="h-screen w-screen flex bg-dark overflow-hidden">
      {/* Sidebar - Fixed */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-black/20 border-r border-white/10 transition-all duration-300 flex flex-col flex-shrink-0`}>
        {/* User Info */}
        <div className="p-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center cursor-pointer hover:bg-primary/30 transition-colors">
              <span className="text-primary font-semibold">{user.email?.[0]?.toUpperCase() || 'U'}</span>
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{user.email}</div>
                <div className="text-xs text-white/60">Student</div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          {[
            { id: 'home', label: 'Home', icon: '🏠', path: '/' },
            { id: 'profile', label: 'Profile', icon: '👤', path: '/profile' },
            { id: 'applications', label: 'Applications', icon: '📝', path: '/applications' },
            { id: 'search', label: 'Program Search', icon: '🔍', path: '/search' },
            { id: 'settings', label: 'Settings', icon: '⚙️', path: '/settings' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => navigateTo(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                item.id === currentPage
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-2 border-t border-white/10 flex-shrink-0">
          <button
            onClick={() => signOut(auth)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200"
          >
            <span className="text-lg">🚪</span>
            {!sidebarCollapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar - Fixed */}
        <div className="h-16 bg-black/20 border-b border-white/10 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <span className="text-xl">☰</span>
            </button>
            <h1 className="text-xl font-semibold text-white">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                <span className="text-xl">🔔</span>
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full text-xs flex items-center justify-center text-black font-bold">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
} 
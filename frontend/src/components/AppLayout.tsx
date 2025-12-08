'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  TrendingUp,
  LayoutDashboard,
  LineChart,
  BarChart3,
  Activity,
  Link2,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  User,
  Calendar,
} from 'lucide-react';

// Static navigation - defined outside component
const NAVIGATION = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Trades', href: '/trades', icon: LineChart },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Market', href: '/market', icon: Activity },
  { name: 'Broker Connect', href: '/broker', icon: Link2 },
  { name: 'Settings', href: '/settings', icon: Settings },
] as const;

// Theme-aware styles
const getStyles = (isDark: boolean) => ({
  // Layout
  container: isDark 
    ? 'min-h-screen bg-slate-950 flex' 
    : 'min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50/30 flex',
  backdrop: isDark ? 'bg-black/50' : 'bg-black/30',
  sidebar: isDark 
    ? 'bg-slate-900/95 border-white/5' 
    : 'bg-white/95 border-slate-300 shadow-xl',
  sidebarBorder: isDark ? 'border-white/5' : 'border-slate-300',
  
  // Nav items
  navActive: isDark
    ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-white border border-indigo-500/30'
    : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30',
  navInactive: isDark
    ? 'text-slate-400 hover:text-white hover:bg-white/5'
    : 'text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 hover:shadow-sm',
  navIconActive: isDark ? 'text-indigo-400' : 'text-white',
  navIconInactive: isDark 
    ? 'text-slate-500 group-hover:text-indigo-400' 
    : 'text-slate-500 group-hover:text-indigo-500',
  navChevron: isDark ? 'text-indigo-400' : 'text-white/80',
  
  // User section
  userBg: isDark 
    ? 'bg-white/5' 
    : 'bg-gradient-to-r from-slate-100 to-slate-50 border border-slate-200 shadow-sm',
  userName: isDark ? 'text-white' : 'text-slate-800',
  userEmail: isDark ? 'text-slate-400' : 'text-slate-500',
  logoutHover: isDark ? 'hover:text-red-400 hover:bg-red-400/10' : 'hover:text-red-500 hover:bg-red-100',
  
  // Mobile bar
  mobileBar: isDark
    ? 'bg-slate-900/95 border-white/5'
    : 'bg-white/95 border-slate-300 shadow-md',
  menuBtn: isDark
    ? 'text-slate-400 hover:text-white hover:bg-white/10'
    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100',
  closeBtn: isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-700',
  
  // Loading
  loadingBg: isDark ? 'bg-slate-950' : 'bg-slate-50',
  
  // Text
  gradientText: isDark 
    ? 'gradient-text' 
    : 'bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent',
});

// Memoized NavItem
const NavItem = memo(({ 
  item, 
  isActive,
  isDark 
}: { 
  item: typeof NAVIGATION[number]; 
  isActive: boolean;
  isDark: boolean;
}) => {
  const styles = getStyles(isDark);
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group
        ${isActive ? styles.navActive : styles.navInactive}`}
    >
      <item.icon className={`w-5 h-5 ${isActive ? styles.navIconActive : styles.navIconInactive}`} />
      {item.name}
      {isActive && <ChevronRight className={`w-4 h-4 ml-auto ${styles.navChevron}`} />}
    </Link>
  );
});
NavItem.displayName = 'NavItem';

// Loading spinner component
const LoadingSpinner = memo(({ isDark }: { isDark: boolean }) => (
  <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent" />
  </div>
));
LoadingSpinner.displayName = 'LoadingSpinner';

// User section component
const UserSection = memo(({ 
  user, 
  onLogout,
  isDark 
}: { 
  user: { name: string; email: string }; 
  onLogout: () => void;
  isDark: boolean;
}) => {
  const styles = getStyles(isDark);
  return (
    <div className={`p-4 border-t ${styles.sidebarBorder}`}>
      <div className={`flex items-center gap-3 p-3 rounded-xl ${styles.userBg}`}>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
          <User className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${styles.userName}`}>{user.name}</p>
          <p className={`text-xs truncate ${styles.userEmail}`}>{user.email}</p>
        </div>
        <button
          onClick={onLogout}
          className={`p-2 text-slate-400 rounded-lg transition-colors ${styles.logoutHover}`}
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
});
UserSection.displayName = 'UserSection';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, loading } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const styles = getStyles(isDark);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleLogout = useCallback(() => {
    logout();
    router.push('/login');
  }, [logout, router]);

  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  if (loading) {
    return <LoadingSpinner isDark={isDark} />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className={styles.container}>
      {/* Sidebar backdrop for mobile */}
      {sidebarOpen && (
        <div
          className={`fixed inset-0 ${styles.backdrop} backdrop-blur-sm z-40 lg:hidden`}
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 ${styles.sidebar} backdrop-blur-xl border-r
          transform transition-transform duration-200 ease-out lg:transform-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={`flex items-center gap-3 px-6 h-16 border-b ${styles.sidebarBorder}`}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className={`text-lg font-bold ${styles.gradientText}`}>Trading Analytics</span>
            <button
              onClick={closeSidebar}
              className={`ml-auto lg:hidden ${styles.closeBtn}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {NAVIGATION.map((item) => (
              <NavItem 
                key={item.name} 
                item={item} 
                isActive={pathname === item.href || pathname?.startsWith(item.href + '/')}
                isDark={isDark}
              />
            ))}
          </nav>

          {/* User section */}
          <UserSection user={user} onLogout={handleLogout} isDark={isDark} />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen lg:ml-0">
        {/* Top bar for mobile */}
        <div className={`lg:hidden sticky top-0 z-30 flex items-center gap-4 px-4 h-16 ${styles.mobileBar} backdrop-blur-xl border-b`}>
          <button
            onClick={toggleSidebar}
            className={`p-2 rounded-lg ${styles.menuBtn}`}
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-md">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className={`font-semibold ${styles.gradientText}`}>Trading Analytics</span>
        </div>

        {/* Page content */}
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

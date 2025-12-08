'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { changePassword } from '@/lib/storage/auth';
import { User } from '@/types';
import {
  User as UserIcon,
  Bell,
  Shield,
  Palette,
  Globe,
  Save,
  Check,
  Loader2,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Monitor,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

type TabType = 'profile' | 'notifications' | 'security' | 'appearance' | 'danger';

// Static data outside component
const TABS: { id: TabType; label: string; icon: React.ElementType; danger?: boolean }[] = [
  { id: 'profile', label: 'Profile', icon: UserIcon },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'danger', label: 'Danger Zone', icon: Trash2, danger: true },
];

const NOTIFICATION_ITEMS = [
  { key: 'email', label: 'Email Notifications', desc: 'Receive updates via email' },
  { key: 'push', label: 'Push Notifications', desc: 'Browser push notifications' },
  { key: 'tradeAlerts', label: 'Trade Alerts', desc: 'Get notified on trade actions' },
  { key: 'dailyReport', label: 'Daily Report', desc: 'Daily P&L summary' },
  { key: 'weeklyDigest', label: 'Weekly Digest', desc: 'Weekly performance summary' },
  { key: 'priceAlerts', label: 'Price Alerts', desc: 'Watchlist price alerts' },
];

const APPEARANCE_TOGGLES = [
  { key: 'compactMode', label: 'Compact Mode', desc: 'Reduce spacing for more content' },
  { key: 'showPnlColors', label: 'P&L Colors', desc: 'Color code profit and loss' },
];

// Memoized Toggle Component
const Toggle = React.memo(({ 
  value, 
  onChange 
}: { 
  value: boolean; 
  onChange: () => void;
}) => (
  <button
    onClick={onChange}
    className={`w-12 h-6 rounded-full transition-colors ${value ? 'bg-indigo-600' : 'bg-slate-700'}`}
  >
    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
  </button>
));
Toggle.displayName = 'Toggle';

export default function SettingsPage() {
  const router = useRouter();
  const { user, updateProfile, logout } = useAuth();
  const { theme: currentTheme, setTheme: applyTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  
  // Profile form
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
  });
  
  // Password form
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState(false);
  
  // Notification settings
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    tradeAlerts: true,
    dailyReport: true,
    weeklyDigest: false,
    priceAlerts: true,
  });
  
  // Appearance settings
  const [appearance, setAppearance] = useState({
    theme: currentTheme,
    compactMode: false,
    showPnlColors: true,
    chartStyle: 'area',
  });

  useEffect(() => {
    setMounted(true);
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        currency: user.preferences?.currency || 'INR',
        timezone: user.preferences?.timezone || 'Asia/Kolkata',
      });
      if (user.preferences?.notifications) {
        setNotifications(prev => ({
          ...prev,
          ...user.preferences!.notifications,
        }));
      }
    }
    // Load saved appearance settings
    const savedAppearance = localStorage.getItem('appearance_settings');
    if (savedAppearance) {
      try {
        const parsed = JSON.parse(savedAppearance);
        setAppearance(prev => ({ ...prev, ...parsed, theme: currentTheme }));
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [user, currentTheme]);

  const handleSaveProfile = useCallback(async () => {
    setSaving(true);
    setError('');
    try {
      await updateProfile({
        name: profileData.name,
        preferences: {
          ...user?.preferences,
          currency: profileData.currency,
          timezone: profileData.timezone,
        } as User['preferences'],
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError('Failed to save profile');
    } finally {
      setSaving(false);
    }
  }, [profileData, user?.preferences, updateProfile]);

  const handleChangePassword = useCallback(async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    setSaving(true);
    setError('');
    try {
      const result = changePassword(passwordData.currentPassword, passwordData.newPassword);
      if (result.success) {
        setSaved(true);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(result.error || 'Failed to change password');
      }
    } catch (err) {
      setError('Failed to change password');
    } finally {
      setSaving(false);
    }
  }, [passwordData]);

  const handleSaveNotifications = useCallback(async () => {
    setSaving(true);
    try {
      await updateProfile({
        preferences: {
          ...user?.preferences,
          notifications: {
            email: notifications.email,
            push: notifications.push,
            tradeAlerts: notifications.tradeAlerts,
            dailyReport: notifications.dailyReport,
          },
        } as User['preferences'],
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [notifications, user?.preferences, updateProfile]);

  const handleSaveAppearance = useCallback(async () => {
    setSaving(true);
    try {
      // Apply theme immediately
      applyTheme(appearance.theme as 'light' | 'dark' | 'system');
      // Save other appearance settings to localStorage
      localStorage.setItem('appearance_settings', JSON.stringify(appearance));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError('Failed to save appearance settings');
    } finally {
      setSaving(false);
    }
  }, [appearance, applyTheme]);

  // Handle immediate theme change when clicking theme buttons
  const handleThemeChange = useCallback((newTheme: 'light' | 'dark' | 'system') => {
    setAppearance(prev => ({ ...prev, theme: newTheme }));
    // Apply theme immediately for instant feedback
    applyTheme(newTheme);
  }, [applyTheme]);

  const toggleNotification = useCallback((key: string) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  }, []);

  const toggleAppearance = useCallback((key: string) => {
    setAppearance(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  }, []);

  const handleDeleteAccount = useCallback(async () => {
    if (deleteConfirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }
    
    setDeleting(true);
    setError('');
    
    try {
      // Clear all user data from localStorage
      const keysToRemove = [
        'trading_app_trades',
        'trading_app_current_user',
        'trading_app_users',
        'trading_app_access_token',
        'trading_app_refresh_token',
        'trading_app_watchlists',
        'trading_app_broker_connections',
        'appearance_settings',
      ];
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Logout user
      await logout();
      
      // Redirect to login page
      router.push('/login');
    } catch (err) {
      setError('Failed to delete account. Please try again.');
      setDeleting(false);
    }
  }, [deleteConfirmText, logout, router]);

  if (!mounted) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-800 rounded w-48" />
          <div className="h-96 bg-slate-800 rounded-2xl" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-slate-400 mt-1">Manage your account and preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Tabs */}
          <div className="lg:w-64 shrink-0">
            <div className="card p-2 space-y-1">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? tab.danger 
                        ? 'bg-red-600/20 text-red-400 border border-red-500/30'
                        : 'bg-indigo-600/20 text-white border border-indigo-500/30'
                      : tab.danger
                        ? 'text-red-400/70 hover:text-red-400 hover:bg-red-500/5'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <tab.icon className={`w-5 h-5 ${
                    activeTab === tab.id 
                      ? tab.danger ? 'text-red-400' : 'text-indigo-400' 
                      : tab.danger ? 'text-red-400/70' : ''
                  }`} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="card">
              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
                  {error}
                </div>
              )}

              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-white mb-4">Profile Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                        <input
                          type="text"
                          value={profileData.name}
                          onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                        <input
                          type="email"
                          value={profileData.email}
                          className="input bg-white/5 cursor-not-allowed"
                          disabled
                        />
                        <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Currency</label>
                        <select
                          value={profileData.currency}
                          onChange={(e) => setProfileData({ ...profileData, currency: e.target.value })}
                          className="input"
                        >
                          <option value="INR">INR (₹)</option>
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Timezone</label>
                        <select
                          value={profileData.timezone}
                          onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })}
                          className="input"
                        >
                          <option value="Asia/Kolkata">IST (India)</option>
                          <option value="America/New_York">EST (New York)</option>
                          <option value="Europe/London">GMT (London)</option>
                          <option value="Asia/Singapore">SGT (Singapore)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4 border-t border-white/5">
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="btn-primary flex items-center gap-2"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : saved ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {saved ? 'Saved!' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-white">Notification Preferences</h2>
                  
                  <div className="space-y-4">
                    {NOTIFICATION_ITEMS.map(item => (
                      <div key={item.key} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                        <div>
                          <p className="font-medium text-white">{item.label}</p>
                          <p className="text-sm text-slate-400">{item.desc}</p>
                        </div>
                        <Toggle 
                          value={notifications[item.key as keyof typeof notifications]} 
                          onChange={() => toggleNotification(item.key)} 
                        />
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-end pt-4 border-t border-white/5">
                    <button
                      onClick={handleSaveNotifications}
                      disabled={saving}
                      className="btn-primary flex items-center gap-2"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {saved ? 'Saved!' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-white">Change Password</h2>
                  
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Current Password</label>
                      <div className="relative">
                        <input
                          type={showPasswords ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                          className="input pr-12"
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(!showPasswords)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
                      <input
                        type={showPasswords ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="input"
                        placeholder="Enter new password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Confirm New Password</label>
                      <input
                        type={showPasswords ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="input"
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4 border-t border-white/5">
                    <button
                      onClick={handleChangePassword}
                      disabled={saving || !passwordData.currentPassword || !passwordData.newPassword}
                      className="btn-primary flex items-center gap-2 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                      {saved ? 'Password Changed!' : 'Change Password'}
                    </button>
                  </div>
                </div>
              )}

              {/* Appearance Tab */}
              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold">Appearance Settings</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-500 dark:text-slate-300 mb-3">Theme</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { id: 'light' as const, icon: Sun, label: 'Light' },
                          { id: 'dark' as const, icon: Moon, label: 'Dark' },
                          { id: 'system' as const, icon: Monitor, label: 'System' },
                        ].map(({ id, icon: Icon, label }) => (
                          <button
                            key={id}
                            onClick={() => handleThemeChange(id)}
                            className={`p-4 rounded-xl border transition-colors text-center ${
                              appearance.theme === id
                                ? 'border-indigo-500 bg-indigo-500/10'
                                : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                            }`}
                          >
                            <Icon className={`w-8 h-8 mx-auto mb-2 ${
                              appearance.theme === id ? 'text-indigo-500' : 'text-slate-400'
                            }`} />
                            <span className="text-sm capitalize">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-500 dark:text-slate-300 mb-3">Chart Style</label>
                      <div className="grid grid-cols-2 gap-3">
                        {['area', 'line', 'bar', 'candle'].map(style => (
                          <button
                            key={style}
                            onClick={() => setAppearance({ ...appearance, chartStyle: style })}
                            className={`p-4 rounded-xl border transition-colors ${
                              appearance.chartStyle === style
                                ? 'border-indigo-500 bg-indigo-500/10'
                                : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                            }`}
                          >
                            <span className="text-sm capitalize">{style} Chart</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {APPEARANCE_TOGGLES.map(item => (
                      <div key={item.key} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-white/5">
                        <div>
                          <p className="font-medium">{item.label}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{item.desc}</p>
                        </div>
                        <Toggle 
                          value={appearance[item.key as keyof typeof appearance] as boolean} 
                          onChange={() => toggleAppearance(item.key)} 
                        />
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-white/5">
                    <button
                      onClick={handleSaveAppearance}
                      disabled={saving}
                      className="btn-primary flex items-center gap-2"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {saved ? 'Saved!' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}

              {/* Danger Zone Tab */}
              {activeTab === 'danger' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                    <h2 className="text-lg font-semibold text-red-500">Danger Zone</h2>
                  </div>
                  
                  <div className="p-6 rounded-xl border-2 border-red-500/30 bg-red-500/5">
                    <h3 className="text-lg font-semibold text-white mb-2">Delete Account</h3>
                    <p className="text-slate-400 mb-4">
                      Once you delete your account, there is no going back. This will permanently delete:
                    </p>
                    <ul className="list-disc list-inside text-slate-400 mb-6 space-y-1">
                      <li>All your trade history and records</li>
                      <li>Your profile and settings</li>
                      <li>Your watchlists</li>
                      <li>All connected broker data</li>
                    </ul>
                    
                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="w-5 h-5" />
                        Delete My Account
                      </button>
                    ) : (
                      <div className="space-y-4 p-4 bg-red-500/10 rounded-xl border border-red-500/30">
                        <p className="text-red-400 font-medium">
                          Are you absolutely sure? This action cannot be undone.
                        </p>
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">
                            Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm:
                          </label>
                          <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            className="input bg-red-500/10 border-red-500/30 focus:border-red-500 focus:ring-red-500/50"
                            placeholder="Type DELETE"
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setShowDeleteConfirm(false);
                              setDeleteConfirmText('');
                            }}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleDeleteAccount}
                            disabled={deleting || deleteConfirmText !== 'DELETE'}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                          >
                            {deleting ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4" />
                                Permanently Delete Account
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

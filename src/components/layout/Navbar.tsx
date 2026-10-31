import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { dbStore } from '../../services/dbStore';
import { DatabaseConsoleModal } from '../../features/database/DatabaseConsoleModal';
import { LoginModal } from '../../features/auth/LoginModal';
import { isSupabaseConfigured } from '../../lib/supabase';
import {
  Bus,
  Clock,
  Shield,
  User,
  RotateCcw,
  Sun,
  Moon,
  Bell,
  CheckCircle,
  AlertTriangle,
  Database,
  X,
  LogIn,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { profile, switchProfile, tenant } = useAuth();
  const [profiles, setProfiles] = useState(dbStore.getProfiles());
  const [tenants, setTenants] = useState(dbStore.getTenants());
  const [timeStr, setTimeStr] = useState<string>('');
  const [isDark, setIsDark] = useState<boolean>(
    document.documentElement.classList.contains('dark')
  );
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDatabaseModal, setShowDatabaseModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [recentLogs, setRecentLogs] = useState(dbStore.getAuditLogs().slice(0, 5));
  const notifRef = useRef<HTMLDivElement>(null);

  // Close notifications on outside click or ESC key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showNotifications]);

  useEffect(() => {
    const unsub = dbStore.subscribe(() => {
      setProfiles(dbStore.getProfiles());
      setTenants(dbStore.getTenants());
      setRecentLogs(dbStore.getAuditLogs().slice(0, 5));
    });
    return unsub;
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Dhaka',
          hour12: true,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' (Dhaka)'
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsub = dbStore.subscribe(() => {
      setRecentLogs(dbStore.getAuditLogs().slice(0, 5));
    });
    return unsub;
  }, []);

  const toggleTheme = () => {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      setIsDark(true);
      localStorage.setItem('theme', 'dark');
    }
  };

  const handleResetSeeds = () => {
    if (
      window.confirm(
        'Reset local demonstration database to pristine factory seeds? (Green Line, Hanif, Shohag)'
      )
    ) {
      dbStore.resetToFactorySeeds();
      window.location.reload();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Bus className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                  BUSMASTER
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  SAAS 2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-none">
                Smart Bus Management • Multi-Tenant Platform
              </p>
            </div>
          </div>

          {/* Quick Persona Tester Pill (For Testing All Roles Instantly) */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Switch Persona:</span>
            <select
              value={profile.id}
              onChange={(e) => switchProfile(e.target.value)}
              className="bg-white dark:bg-slate-900 font-medium text-slate-800 dark:text-slate-100 rounded-md px-2 py-0.5 border border-slate-300 dark:border-slate-600 focus:outline-none cursor-pointer max-w-xs truncate"
            >
              <optgroup label="👑 Super Admin (Platform Authority)">
                {profiles
                  .filter((p) => p.role === 'super_admin')
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      👑 {p.full_name} (Global Super Admin)
                    </option>
                  ))}
              </optgroup>

              <optgroup label="🏢 Company Owners & Appointed Administrators">
                {profiles
                  .filter((p) => p.role === 'company_owner' || p.role === 'company_admin')
                  .map((p) => {
                    const comp = tenants.find((t) => t.id === p.tenant_id);
                    const roleLabel = p.role === 'company_owner' ? 'Owner' : 'Company Admin';
                    return (
                      <option key={p.id} value={p.id}>
                        🏢 {p.full_name} — {comp?.name || 'Transport'} ({roleLabel})
                      </option>
                    );
                  })}
              </optgroup>

              <optgroup label="📋 Terminal & Counter Operations">
                {profiles
                  .filter((p) => p.role === 'counter_manager' || p.role === 'counter_agent')
                  .map((p) => {
                    const comp = tenants.find((t) => t.id === p.tenant_id);
                    return (
                      <option key={p.id} value={p.id}>
                        {p.role === 'counter_manager' ? '📋' : '🎫'} {p.full_name} — {comp?.name || 'Transport'}
                      </option>
                    );
                  })}
              </optgroup>

              <optgroup label="🚌 Fleet Drivers & Supervisors">
                {profiles
                  .filter((p) => p.role === 'driver' || p.role === 'supervisor')
                  .map((p) => {
                    const comp = tenants.find((t) => t.id === p.tenant_id);
                    return (
                      <option key={p.id} value={p.id}>
                        {p.role === 'driver' ? '🚌' : '👁️'} {p.full_name} — {comp?.name || 'Transport'}
                      </option>
                    );
                  })}
              </optgroup>

              <optgroup label="🧑 Passengers & Customers">
                {profiles
                  .filter((p) => p.role === 'customer')
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      🧑 {p.full_name}
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          {/* Actions & Profile info */}
          <div className="flex items-center gap-3">
            {/* Live Dhaka Clock */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span className="font-mono font-medium">{timeStr || 'Asia/Dhaka'}</span>
            </div>

            {/* Database Console Modal Trigger */}
            <button
              onClick={() => setShowDatabaseModal(true)}
              className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 transition font-medium shadow-sm"
              title="Database Console & Cloud Sync"
            >
              <Database className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline">Database</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </button>

            {/* Factory Seed Reset */}
            <button
              onClick={handleResetSeeds}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Reset Demo Database"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Notifications / Audit Log Flyout */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition relative cursor-pointer"
                title="System Notifications & Audit"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        Live Audit Stream
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded font-mono font-bold">
                        REALTIME
                      </span>
                    </div>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      title="Close notification flyout (Esc)"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-1 max-h-60 overflow-y-auto">
                    {recentLogs.map((log) => (
                      <div key={log.id} className="py-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {log.action}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(log.created_at || '').toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {log.actor_name || 'System'} • {log.entity_type} #{log.entity_id}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Flyout bottom dismiss footer */}
                  <div className="pt-2.5 mt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Press ESC or click outside</span>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Super Admin Login / Sign In Button */}
            <button
              onClick={() => setShowLoginModal(true)}
              className="flex items-center gap-1.5 text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/70 hover:bg-purple-100 dark:hover:bg-purple-900/60 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800 transition font-medium cursor-pointer shadow-sm"
              title="Sign in with Email & Password"
            >
              <LogIn className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span className="hidden sm:inline">Sign In</span>
            </button>

            {/* User Identity Chip */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-xs border border-blue-200 dark:border-blue-800">
                {profile.full_name?.charAt(0) || 'U'}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                  {profile.full_name}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight capitalize">
                  {profile.role.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Database Console Modal */}
      <DatabaseConsoleModal
        isOpen={showDatabaseModal}
        onClose={() => setShowDatabaseModal(false)}
      />

      {/* Super Admin Credentials Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </header>
  );
};

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { PortalSwitcher } from './components/layout/PortalSwitcher';
import { SuperAdminPortal } from './features/dashboard/SuperAdminPortal';
import { CompanyOwnerPortal } from './features/dashboard/CompanyOwnerPortal';
import { CounterAgentPortal } from './features/counters/CounterAgentPortal';
import { CounterManagerPortal } from './features/counters/CounterManagerPortal';
import { DriverPortal } from './features/trips/DriverPortal';
import { SupervisorPortal } from './features/trips/SupervisorPortal';
import { SupportPortal } from './features/support/SupportPortal';
import { CustomerBookingPortal } from './features/customers/CustomerBookingPortal';
import { DatabaseConsoleModal } from './features/database/DatabaseConsoleModal';
import { isSupabaseConfigured, onDatabaseConfigChange } from './lib/supabase';
import { ShieldCheck, Database, Zap, BarChart2, HeartHandshake } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

const AppContent: React.FC = () => {
  const { activePortal } = useAuth();
  const [showDatabaseModal, setShowDatabaseModal] = useState(false);
  const [isCloudConfigured, setIsCloudConfigured] = useState(isSupabaseConfigured());

  useEffect(() => {
    const unsub = onDatabaseConfigChange(() => {
      setIsCloudConfigured(isSupabaseConfigured());
    });
    return unsub;
  }, []);

  const renderActivePortal = () => {
    switch (activePortal) {
      case 'super_admin':
        return <SuperAdminPortal />;
      case 'company_owner':
        return <CompanyOwnerPortal />;
      case 'counter_agent':
        return <CounterAgentPortal />;
      case 'counter_manager':
        return <CounterManagerPortal />;
      case 'driver':
        return <DriverPortal />;
      case 'supervisor':
        return <SupervisorPortal />;
      case 'support':
        return <SupportPortal />;
      case 'customer':
      default:
        return <CustomerBookingPortal />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Master Portal Switcher Bar */}
        <PortalSwitcher />

        {/* Dynamic Portal View */}
        <div className="transition-all duration-200">
          {renderActivePortal()}
        </div>
      </main>

      {/* Enterprise Platform Footer (From God Master Prompt Specification) */}
      <footer className="mt-auto bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 transition-colors no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Secure & Reliable Tenancy</span>
            </div>
            <button
              onClick={() => setShowDatabaseModal(true)}
              className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Open Database Console & Cloud Sync"
            >
              <Database className="w-4 h-4 text-blue-500" />
              <span>
                Backend: Supabase PostgreSQL {isCloudConfigured ? '(Connected)' : '(Local Mode)'}
              </span>
              <span className={`w-2 h-2 rounded-full ${isCloudConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            </button>
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Atomic Segment Inventory</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <BarChart2 className="w-4 h-4 text-purple-500" />
              <span>Advanced SaaS Analytics</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <HeartHandshake className="w-4 h-4 text-rose-500" />
              <span>Built for Bangladesh (BDT ৳)</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <p>© 2026 BUSMASTER Platform. Multi-Tenant Bus Reservation & Fleet Operating System.</p>
            <p className="font-mono text-[11px]">
              Asia/Dhaka Standard Time • DD-MM-YYYY • RLS Isolated
            </p>
          </div>
        </div>
      </footer>

      {/* Database Console Modal */}
      <DatabaseConsoleModal
        isOpen={showDatabaseModal}
        onClose={() => setShowDatabaseModal(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}

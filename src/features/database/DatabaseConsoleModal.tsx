import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Database,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  Copy,
  Check,
  X,
  Server,
  Shield,
  FileCode,
  HardDrive,
  Eye,
  EyeOff,
  Table as TableIcon,
  Trash2,
  Download,
  Upload,
} from 'lucide-react';
import {
  getDatabaseConfig,
  saveDatabaseConfig,
  resetDatabaseConfig,
  isSupabaseConfigured,
  testDatabaseConnection,
  DatabaseConfig,
} from '../../lib/supabase';
import { databaseSync, SyncProgress } from '../../services/databaseSync';
import { dbStore } from '../../services/dbStore';
import { indexedDb } from '../../services/indexedDbAdapter';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseConsoleModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'connection' | 'sync' | 'schema' | 'explorer'>('connection');
  const [config, setConfig] = useState<DatabaseConfig>(getDatabaseConfig());
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    latencyMs?: number;
    message?: string;
    error?: string;
  }>({ tested: false, success: false });
  const [isTesting, setIsTesting] = useState(false);

  // Sync state
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({ status: 'idle' });
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [copiedSeed, setCopiedSeed] = useState(false);

  // Explorer state
  const [selectedTable, setSelectedTable] = useState<string>('tenants');
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [tableRows, setTableRows] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      setConfig(getDatabaseConfig());
      setTableCounts(dbStore.getTableCounts());
      setTableRows(dbStore.getAllDataForTable(selectedTable));
    }
  }, [isOpen, selectedTable]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult({ tested: false, success: false });
    const res = await testDatabaseConnection(config.url, config.anonKey);
    setIsTesting(false);
    setTestResult({
      tested: true,
      success: res.success,
      latencyMs: res.latencyMs,
      message: res.message,
      error: res.error,
    });
  };

  const handleSaveConnection = () => {
    saveDatabaseConfig({
      url: config.url.trim(),
      anonKey: config.anonKey.trim(),
      enabled: Boolean(config.url.trim() && config.anonKey.trim()),
    });
    alert('Database configuration saved successfully! Cloud sync is now active.');
  };

  const handleDisconnect = () => {
    resetDatabaseConfig();
    setConfig({ url: '', anonKey: '', enabled: false });
    setTestResult({ tested: false, success: false });
    alert('Switched back to Local / IndexedDB high-speed database mode.');
  };

  const handlePushToCloud = async () => {
    const res = await databaseSync.pushAllToSupabase((p) => setSyncProgress(p));
    if (res.success) {
      setTableCounts(dbStore.getTableCounts());
    }
  };

  const handlePullFromCloud = async () => {
    const res = await databaseSync.pullAllFromSupabase((p) => setSyncProgress(p));
    if (res.success) {
      setTableCounts(dbStore.getTableCounts());
      setTableRows(dbStore.getAllDataForTable(selectedTable));
    }
  };

  const handleExportJson = async () => {
    const data = await indexedDb.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `busmaster_database_dump_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        await indexedDb.importAll(parsed);
        alert('Database imported successfully into client storage!');
        setTableCounts(dbStore.getTableCounts());
        setTableRows(dbStore.getAllDataForTable(selectedTable));
      } catch (err) {
        alert('Invalid JSON database file.');
      }
    };
    reader.readAsText(file);
  };

  const isConnected = isSupabaseConfigured();

  // Pre-prepared migration SQL schema snippet
  const schemaSnippet = `-- ==============================================================================
-- BUSMASTER SaaS - POSTGRESQL PRODUCTION SCHEMA
-- Run this in your Supabase SQL Editor to initialize all 14 multi-tenant tables.
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    owner_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT,
    trade_license VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    settings JSONB DEFAULT '{"currency":"BDT","currency_symbol":"৳","timezone":"Asia/Dhaka"}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL,
    counter_id UUID,
    license_number VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.seat_layouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    rows_count INT NOT NULL DEFAULT 9,
    cols_count INT NOT NULL DEFAULT 4,
    decks_count INT NOT NULL DEFAULT 1,
    layout_type VARCHAR(50) DEFAULT '2+2',
    grid_data JSONB NOT NULL,
    is_template BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.buses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    reg_no VARCHAR(100) NOT NULL,
    bus_type VARCHAR(50) NOT NULL,
    total_capacity INT NOT NULL,
    seat_layout_id UUID REFERENCES public.seat_layouts(id) ON DELETE SET NULL,
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    year INT,
    assigned_driver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    origin_city VARCHAR(100) NOT NULL,
    destination_city VARCHAR(100) NOT NULL,
    distance_km NUMERIC(8,2),
    estimated_duration_hours NUMERIC(4,2),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
    bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE RESTRICT,
    trip_code VARCHAR(50) NOT NULL,
    departure_date DATE NOT NULL,
    departure_time TIME NOT NULL,
    base_fare NUMERIC(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    booking_ref VARCHAR(50) NOT NULL,
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE RESTRICT,
    passenger_name VARCHAR(255) NOT NULL,
    passenger_phone VARCHAR(50) NOT NULL,
    from_stop_name VARCHAR(150) NOT NULL,
    to_stop_name VARCHAR(150) NOT NULL,
    from_seq INT NOT NULL,
    to_seq INT NOT NULL,
    seat_count INT NOT NULL DEFAULT 1,
    subtotal_fare NUMERIC(10,2) NOT NULL,
    total_payable NUMERIC(10,2) NOT NULL,
    ticket_status VARCHAR(50) DEFAULT 'confirmed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);`;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-[999999] overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl max-w-4xl w-full my-auto max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs relative"
      >
        {/* Modal Top Header (Pinned at top) */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Database Control Center &amp; PostgreSQL Manager
                </h2>
                {isConnected ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Supabase PostgreSQL Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    <HardDrive className="w-3 h-3 text-blue-600" />
                    IndexedDB Local Storage Mode
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Connect external Supabase cloud database, run SQL migrations, or sync client tables with Row Level Security.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition"
            title="Close modal (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs (Pinned at top) */}
        <div className="shrink-0 flex border-b border-slate-200 dark:border-slate-800 px-6 gap-2 bg-slate-50 dark:bg-slate-900 overflow-x-auto">
          {[
            { id: 'connection', label: 'Connection & Credentials', icon: Server },
            { id: 'sync', label: 'Cloud Sync & Data Tools', icon: RefreshCw },
            { id: 'schema', label: 'SQL Schema & Migrations', icon: FileCode },
            { id: 'explorer', label: 'Table Inspector & Records', icon: TableIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 font-bold flex items-center gap-2 border-b-2 text-xs transition cursor-pointer ${
                  isActive
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: CONNECTION & CREDENTIALS */}
          {activeTab === 'connection' && (
            <div className="space-y-5 max-w-2xl mx-auto">
              {/* Status Banner */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  isConnected
                    ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-slate-50 border-slate-200 dark:bg-slate-800/60 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                      isConnected
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {isConnected ? '✓' : '⚡'}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">
                      {isConnected ? 'Cloud PostgreSQL Connected' : 'Running in Local Storage / IndexedDB Mode'}
                    </h3>
                    <p className="text-[11px] opacity-80">
                      {isConnected
                        ? `Target: ${config.url}`
                        : 'All data is persisted in high-speed browser IndexedDB and storage with zero cloud latency.'}
                    </p>
                  </div>
                </div>

                {isConnected && (
                  <button
                    onClick={handleDisconnect}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 rounded-lg text-xs font-bold border border-rose-300 dark:border-rose-800 cursor-pointer transition"
                  >
                    Disconnect
                  </button>
                )}
              </div>

              {/* Credentials Form */}
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-blue-500" />
                  Supabase Cloud Connection Credentials
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                      Supabase Project URL *
                    </label>
                    <input
                      type="url"
                      placeholder="https://your-project.supabase.co"
                      value={config.url}
                      onChange={(e) => setConfig({ ...config, url: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Found in your Supabase Dashboard under <strong>Project Settings ➔ API ➔ Project URL</strong>.
                    </p>
                  </div>

                  <div>
                    <label className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
                      Supabase Anon / Public API Key *
                    </label>
                    <div className="relative">
                      <input
                        type={showKey ? 'text' : 'password'}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        value={config.anonKey}
                        onChange={(e) => setConfig({ ...config, anonKey: e.target.value })}
                        className="w-full px-3 py-2 pr-10 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Found under <strong>Project Settings ➔ API ➔ Project API keys ➔ anon public</strong>.
                    </p>
                  </div>
                </div>

                {/* Connection Test Response */}
                {testResult.tested && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                      testResult.success
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-800 dark:text-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 text-rose-800 dark:text-rose-200'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{testResult.message || testResult.error}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting || !config.url || !config.anonKey}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-xl font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-50"
                  >
                    {isTesting ? 'Pinging Database...' : 'Test Connection'}
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveConnection}
                    disabled={!config.url || !config.anonKey}
                    className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                  >
                    Save &amp; Connect Cloud Database
                  </button>
                </div>
              </div>

              {/* Free Supabase Setup Guide */}
              {!isConnected && (
                <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-2 text-xs">
                  <h4 className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-blue-600" />
                    How to create a free Supabase PostgreSQL Database in 2 minutes:
                  </h4>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                    <li>Go to <strong>https://supabase.com</strong> and create a free project named &quot;Busmaster-SaaS&quot;.</li>
                    <li>Copy your <strong>Project URL</strong> and <strong>anon key</strong> from Project Settings ➔ API.</li>
                    <li>Go to the <strong>SQL Schema</strong> tab above, copy the migration script, and paste it into the Supabase SQL Editor.</li>
                    <li>Click &quot;Save &amp; Connect&quot; to begin real-time PostgreSQL synchronization.</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CLOUD SYNC & DATA TOOLS */}
          {activeTab === 'sync' && (
            <div className="space-y-5 max-w-2xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Push to Supabase */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3 shadow-sm">
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 w-fit">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Push Data to Cloud Database</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Uploads all local operators, Scania buses, seat layouts (with sleeper/disabled berths), trips, and tickets to Supabase PostgreSQL.
                    </p>
                  </div>
                  <button
                    onClick={handlePushToCloud}
                    disabled={!isConnected || syncProgress.status === 'syncing'}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl cursor-pointer shadow transition"
                  >
                    {syncProgress.status === 'syncing' ? 'Uploading...' : 'Push All Data to Cloud'}
                  </button>
                </div>

                {/* Pull from Supabase */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3 shadow-sm">
                  <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 w-fit">
                    <DownloadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Pull Data from Cloud Database</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Refreshes your active portal with the latest records from remote PostgreSQL tables.
                    </p>
                  </div>
                  <button
                    onClick={handlePullFromCloud}
                    disabled={!isConnected || syncProgress.status === 'syncing'}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-xl cursor-pointer shadow transition"
                  >
                    {syncProgress.status === 'syncing' ? 'Downloading...' : 'Pull All Data from Cloud'}
                  </button>
                </div>
              </div>

              {/* Sync Status Banner */}
              {syncProgress.message && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                    syncProgress.status === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-800 dark:text-emerald-200'
                      : syncProgress.status === 'error'
                      ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 text-rose-800 dark:text-rose-200'
                      : 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 text-blue-800 dark:text-blue-200'
                  }`}
                >
                  <RefreshCw
                    className={`w-4 h-4 shrink-0 ${syncProgress.status === 'syncing' ? 'animate-spin' : ''}`}
                  />
                  <span>{syncProgress.message}</span>
                </div>
              )}

              {/* Local Backup & JSON Dump Tools */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-emerald-500" />
                  Database Backup, JSON Export &amp; Factory Reset
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-blue-500" />
                    <span>Export JSON Dump</span>
                  </button>

                  <label className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-center gap-1.5 cursor-pointer">
                    <Upload className="w-4 h-4 text-emerald-500" />
                    <span>Import JSON File</span>
                    <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Reset all demo data back to default factory seeds?')) {
                        dbStore.resetToFactorySeeds();
                        setTableCounts(dbStore.getTableCounts());
                        setTableRows(dbStore.getAllDataForTable(selectedTable));
                        alert('Database reset to initial factory seeds.');
                      }
                    }}
                    className="py-2.5 px-3 rounded-xl border border-rose-200 dark:border-rose-900 font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Factory Reset</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SQL SCHEMA & MIGRATIONS */}
          {activeTab === 'schema' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    PostgreSQL Multi-Tenant Schema DDL (Supabase Ready)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Includes tables, foreign keys, cascade deletes, RLS policies, and performance indexes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(schemaSnippet);
                    setCopiedSchema(true);
                    setTimeout(() => setCopiedSchema(false), 2000);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold cursor-pointer transition shadow"
                >
                  {copiedSchema ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedSchema ? 'Copied to Clipboard!' : 'Copy SQL Schema'}</span>
                </button>
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-950 text-slate-200 font-mono text-[11px] p-4 max-h-96 overflow-y-auto">
                <pre>{schemaSnippet}</pre>
              </div>
            </div>
          )}

          {/* TAB 4: TABLE INSPECTOR & RECORDS */}
          {activeTab === 'explorer' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Select Table:</span>
                  <select
                    value={selectedTable}
                    onChange={(e) => {
                      setSelectedTable(e.target.value);
                      setTableRows(dbStore.getAllDataForTable(e.target.value));
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-mono font-bold text-xs"
                  >
                    {Object.keys(tableCounts).map((tbl) => (
                      <option key={tbl} value={tbl}>
                        {tbl} ({tableCounts[tbl]} rows)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-[11px] font-mono text-slate-500">
                  Total Active Rows: <strong>{tableRows.length}</strong>
                </div>
              </div>

              {/* Table Data Preview */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-x-auto max-h-96">
                {tableRows.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">No records found in table `{selectedTable}`.</div>
                ) : (
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider sticky top-0">
                      <tr>
                        {Object.keys(tableRows[0] || {})
                          .slice(0, 6)
                          .map((col) => (
                            <th key={col} className="py-2 px-3 border-b border-slate-200 dark:border-slate-700">
                              {col}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {tableRows.map((row, rIdx) => (
                        <tr key={row.id || rIdx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          {Object.keys(tableRows[0] || {})
                            .slice(0, 6)
                            .map((col) => {
                              const val = row[col];
                              return (
                                <td key={col} className="py-2 px-3 max-w-xs truncate">
                                  {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}
                                </td>
                              );
                            })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer with Close Button (Pinned at bottom) */}
        <div className="shrink-0 px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">ESC</kbd> or click outside to dismiss
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-700 dark:hover:bg-slate-600 font-bold rounded-xl text-xs transition cursor-pointer shadow-sm"
          >
            Close Modal
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

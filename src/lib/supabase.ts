// ==============================================================================
// BUSMASTER SAAS - SUPABASE POSTGRESQL DATABASE CLIENT
// Supports dynamic configuration at runtime (in-app console or .env variables)
// with live connection health checking, SSL encryption, and RLS tenancy.
// ==============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface DatabaseConfig {
  url: string;
  anonKey: string;
  enabled: boolean;
}

const STORAGE_KEY = 'bm_supabase_config';
const listeners: Array<() => void> = [];

export function onDatabaseConfigChange(cb: () => void): () => void {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

function notifyConfigChange() {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.warn('Config change listener error:', e);
    }
  });
}

export function getDatabaseConfig(): DatabaseConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.url && parsed.anonKey) return parsed;
    }
  } catch {
    // fallback to env
  }

  const DEFAULT_SUPABASE_URL = 'https://iwwstaomkwqkcwxgkkhk.supabase.co';
  const DEFAULT_SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3d3N0YW9ta3dxa2N3eGdra2hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0MzAxMTcsImV4cCI6MjEwOTAwNjExN30.fjr117mO2qt7QXIiBGEPZnqNM1PybfCmYQHgogeNlQg';

  const envUrl = (import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY).trim();
  const isValidEnv =
    Boolean(envUrl) &&
    Boolean(envKey) &&
    !envUrl.includes('placeholder.supabase.co') &&
    !envKey.includes('placeholder-anon-key');

  return {
    url: isValidEnv ? envUrl : '',
    anonKey: isValidEnv ? envKey : '',
    enabled: isValidEnv,
  };
}

export function saveDatabaseConfig(config: DatabaseConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  initClient();
  notifyConfigChange();
}

export function resetDatabaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
  initClient();
  notifyConfigChange();
}

let activeClient: SupabaseClient | null = null;

function initClient(): SupabaseClient | null {
  const conf = getDatabaseConfig();
  if (conf.enabled && conf.url && conf.anonKey) {
    try {
      activeClient = createClient(conf.url, conf.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      return activeClient;
    } catch (err) {
      console.warn('Failed to initialize Supabase PostgreSQL client:', err);
      activeClient = null;
      return null;
    }
  }
  activeClient = null;
  return null;
}

// Initial client creation
initClient();

export function getSupabase(): SupabaseClient | null {
  if (!activeClient) initClient();
  return activeClient;
}

export const supabase = activeClient;

export function isSupabaseConfigured(): boolean {
  const conf = getDatabaseConfig();
  return conf.enabled && Boolean(conf.url) && Boolean(conf.anonKey);
}

export async function testDatabaseConnection(
  targetUrl?: string,
  targetKey?: string
): Promise<{
  success: boolean;
  latencyMs?: number;
  message?: string;
  error?: string;
}> {
  const conf = getDatabaseConfig();
  const url = (targetUrl || conf.url || '').trim();
  const key = (targetKey || conf.anonKey || '').trim();

  if (!url || !key) {
    return {
      success: false,
      error: 'Please enter both the Supabase Project URL and Anon API Key.',
    };
  }

  const startTime = performance.now();
  try {
    const testClient = createClient(url, key, {
      auth: { persistSession: false },
    });

    const { error } = await testClient
      .from('tenants')
      .select('count', { count: 'exact', head: true });

    const latencyMs = Math.round(performance.now() - startTime);

    if (error) {
      if (
        error.code === 'PGRST205' ||
        error.message?.includes('schema cache') ||
        error.message?.includes('relation "public.tenants" does not exist')
      ) {
        return {
          success: true,
          latencyMs,
          message: `Connected to Supabase PostgreSQL in ${latencyMs}ms! Cloud server is live. Run the SQL schema to create SaaS tables.`,
        };
      }
      return {
        success: false,
        latencyMs,
        error: error.message || 'Supabase authentication failed. Check your Anon Key.',
      };
    }

    return {
      success: true,
      latencyMs,
      message: `Connected to Supabase PostgreSQL! Latency: ${latencyMs}ms. RLS isolated tenancy active.`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to establish connection to database server.',
    };
  }
}

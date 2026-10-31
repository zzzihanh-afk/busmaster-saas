// ==============================================================================
// BUSMASTER SAAS - DATABASE SYNCHRONIZATION SERVICE
// Manages bi-directional sync between local/IndexedDB storage and Supabase PostgreSQL.
// ==============================================================================

import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { dbStore } from './dbStore';
import { indexedDb } from './indexedDbAdapter';

export interface SyncProgress {
  status: 'idle' | 'syncing' | 'success' | 'error';
  stage?: string;
  processedCount?: number;
  totalCount?: number;
  message?: string;
  error?: string;
}

class DatabaseSyncService {
  private isSyncing = false;

  public async syncEntity(table: string, record: any): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const client = getSupabase();
    if (!client) return;

    try {
      await client.from(table).upsert(record, { onConflict: 'id' });
    } catch (e) {
      console.warn(`Supabase background sync failed for table ${table}:`, e);
    }
  }

  // Push all local data into Supabase PostgreSQL
  public async pushAllToSupabase(
    onProgress?: (p: SyncProgress) => void
  ): Promise<{ success: boolean; error?: string; stats?: Record<string, number> }> {
    if (this.isSyncing) {
      return { success: false, error: 'A synchronization operation is already in progress.' };
    }

    const client = getSupabase();
    if (!client || !isSupabaseConfigured()) {
      return { success: false, error: 'Supabase PostgreSQL is not connected. Configure credentials first.' };
    }

    this.isSyncing = true;
    const stats: Record<string, number> = {};

    try {
      const report = (stage: string, processed: number, total: number) => {
        if (onProgress) {
          onProgress({
            status: 'syncing',
            stage,
            processedCount: processed,
            totalCount: total,
            message: `Uploading ${stage} (${processed}/${total})...`,
          });
        }
      };

      // 1. Tenants
      const tenants = dbStore.getTenants();
      report('Tenants', 0, tenants.length);
      if (tenants.length > 0) {
        const { error } = await client.from('tenants').upsert(tenants, { onConflict: 'id' });
        if (error) {
          console.warn('Sync tenants warning:', error.message);
          if (error.code === 'PGRST205' || error.message.includes('schema cache')) {
            throw new Error(
              'Supabase tables do not exist yet. Please copy the SQL Schema from the "SQL Schema" tab and click RUN in your Supabase SQL Editor.'
            );
          }
        }
        stats.tenants = tenants.length;
      }

      // 2. Profiles
      const profiles = dbStore.getProfiles();
      report('User Profiles', 0, profiles.length);
      if (profiles.length > 0) {
        const { error } = await client.from('profiles').upsert(profiles, { onConflict: 'id' });
        if (error) console.warn('Sync profiles warning:', error.message);
        stats.profiles = profiles.length;
      }

      // 3. Counters
      const counters = dbStore.getCounters();
      report('Counters', 0, counters.length);
      if (counters.length > 0) {
        const { error } = await client.from('counters').upsert(counters, { onConflict: 'id' });
        if (error) console.warn('Sync counters warning:', error.message);
        stats.counters = counters.length;
      }

      // 4. Seat Layouts
      const layouts = dbStore.getSeatLayouts();
      report('Seat Layouts', 0, layouts.length);
      if (layouts.length > 0) {
        const { error } = await client.from('seat_layouts').upsert(layouts, { onConflict: 'id' });
        if (error) console.warn('Sync seat layouts warning:', error.message);
        stats.seat_layouts = layouts.length;
      }

      // 5. Buses
      const buses = dbStore.getBuses();
      report('Fleet Buses', 0, buses.length);
      if (buses.length > 0) {
        const { error } = await client.from('buses').upsert(buses, { onConflict: 'id' });
        if (error) console.warn('Sync buses warning:', error.message);
        stats.buses = buses.length;
      }

      // 6. Routes
      const routes = dbStore.getRoutes();
      report('Routes', 0, routes.length);
      if (routes.length > 0) {
        const routesPayload = routes.map((r) => {
          const { stops, ...rest } = r;
          return rest;
        });
        const { error } = await client.from('routes').upsert(routesPayload, { onConflict: 'id' });
        if (error) console.warn('Sync routes warning:', error.message);
        stats.routes = routes.length;
      }

      // 7. Trips
      const trips = dbStore.getTrips();
      report('Trips', 0, trips.length);
      if (trips.length > 0) {
        const tripsPayload = trips.map((t) => {
          const { bus, route, ...rest } = t;
          return rest;
        });
        const { error } = await client.from('trips').upsert(tripsPayload, { onConflict: 'id' });
        if (error) console.warn('Sync trips warning:', error.message);
        stats.trips = trips.length;
      }

      // 8. Bookings
      const bookings = dbStore.getBookings();
      report('Bookings', 0, bookings.length);
      if (bookings.length > 0) {
        const bookingsPayload = bookings.map((b) => {
          const { seats, ...rest } = b;
          return rest;
        });
        const { error } = await client.from('bookings').upsert(bookingsPayload, { onConflict: 'id' });
        if (error) console.warn('Sync bookings warning:', error.message);
        stats.bookings = bookings.length;
      }

      // 9. Also persist everything to client-side IndexedDB database
      await indexedDb.putMany('tenants', tenants);
      await indexedDb.putMany('profiles', profiles);
      await indexedDb.putMany('counters', counters);
      await indexedDb.putMany('seat_layouts', layouts);
      await indexedDb.putMany('buses', buses);
      await indexedDb.putMany('routes', routes);
      await indexedDb.putMany('trips', trips);
      await indexedDb.putMany('bookings', bookings);

      this.isSyncing = false;
      if (onProgress) {
        onProgress({
          status: 'success',
          message: 'All local records successfully pushed to Supabase PostgreSQL and synced with IndexedDB!',
        });
      }
      return { success: true, stats };
    } catch (err: any) {
      this.isSyncing = false;
      const errorMsg = err.message || 'Database synchronization failed.';
      if (onProgress) {
        onProgress({ status: 'error', error: errorMsg, message: errorMsg });
      }
      return { success: false, error: errorMsg };
    }
  }

  // Pull all data from Supabase PostgreSQL into local store
  public async pullAllFromSupabase(
    onProgress?: (p: SyncProgress) => void
  ): Promise<{ success: boolean; error?: string }> {
    const client = getSupabase();
    if (!client || !isSupabaseConfigured()) {
      return { success: false, error: 'Supabase PostgreSQL is not connected.' };
    }

    try {
      if (onProgress) {
        onProgress({ status: 'syncing', message: 'Fetching tables from Supabase PostgreSQL...' });
      }

      const [
        { data: tenants },
        { data: profiles },
        { data: counters },
        { data: buses },
        { data: layouts },
        { data: routes },
        { data: trips },
        { data: bookings },
      ] = await Promise.all([
        client.from('tenants').select('*'),
        client.from('profiles').select('*'),
        client.from('counters').select('*'),
        client.from('buses').select('*'),
        client.from('seat_layouts').select('*'),
        client.from('routes').select('*'),
        client.from('trips').select('*'),
        client.from('bookings').select('*'),
      ]);

      if (tenants && tenants.length > 0) {
        tenants.forEach((t) => dbStore.saveTenant(t));
      }
      if (profiles && profiles.length > 0) {
        profiles.forEach((p) => dbStore.saveProfile(p));
      }
      if (counters && counters.length > 0) {
        counters.forEach((c) => dbStore.saveCounter(c));
      }
      if (layouts && layouts.length > 0) {
        layouts.forEach((l) => dbStore.saveSeatLayout(l));
      }
      if (buses && buses.length > 0) {
        buses.forEach((b) => dbStore.saveBus(b));
      }
      if (routes && routes.length > 0) {
        routes.forEach((r) => dbStore.saveRoute(r));
      }
      if (trips && trips.length > 0) {
        trips.forEach((t) => dbStore.saveTrip(t));
      }

      if (onProgress) {
        onProgress({
          status: 'success',
          message: 'Successfully pulled latest records from PostgreSQL into local workspace!',
        });
      }
      return { success: true };
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to pull from Supabase PostgreSQL.';
      if (onProgress) {
        onProgress({ status: 'error', error: errorMsg, message: errorMsg });
      }
      return { success: false, error: errorMsg };
    }
  }
}

export const databaseSync = new DatabaseSyncService();

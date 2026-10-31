// ==============================================================================
// BUSMASTER SAAS - CLIENT-SIDE INDEXEDDB DATABASE ADAPTER
// Provides a persistent, transactional browser database with zero size limits.
// Supports offline resilience and complements cloud PostgreSQL (Supabase).
// ==============================================================================

const DB_NAME = 'busmaster_saas_db';
const DB_VERSION = 1;

export const DB_TABLES = [
  'tenants',
  'profiles',
  'counters',
  'cash_sessions',
  'seat_layouts',
  'buses',
  'routes',
  'trips',
  'bookings',
  'seat_locks',
  'expenses',
  'refunds',
  'support_tickets',
  'reviews',
  'audit_logs',
] as const;

export type TableName = (typeof DB_TABLES)[number];

class IndexedDbAdapter {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB is not available in this environment.'));
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        for (const table of DB_TABLES) {
          if (!db.objectStoreNames.contains(table)) {
            db.createObjectStore(table, { keyPath: 'id' });
          }
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  public async getAll<T>(tableName: TableName): Promise<T[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(tableName, 'readonly');
        const store = transaction.objectStore(tableName);
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result as T[]) || []);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return [];
    }
  }

  public async getById<T>(tableName: TableName, id: string): Promise<T | undefined> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(tableName, 'readonly');
        const store = transaction.objectStore(tableName);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return undefined;
    }
  }

  public async put<T extends { id: string }>(tableName: TableName, item: T): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(tableName, 'readwrite');
        const store = transaction.objectStore(tableName);
        const req = store.put(item);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn(`IndexedDB put error on ${tableName}:`, e);
    }
  }

  public async putMany<T extends { id: string }>(tableName: TableName, items: T[]): Promise<void> {
    if (!items || items.length === 0) return;
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(tableName, 'readwrite');
        const store = transaction.objectStore(tableName);
        items.forEach((item) => store.put(item));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (e) {
      console.warn(`IndexedDB putMany error on ${tableName}:`, e);
    }
  }

  public async delete(tableName: TableName, id: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(tableName, 'readwrite');
        const store = transaction.objectStore(tableName);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn(`IndexedDB delete error on ${tableName}:`, e);
    }
  }

  public async clear(tableName: TableName): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(tableName, 'readwrite');
        const store = transaction.objectStore(tableName);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn(`IndexedDB clear error on ${tableName}:`, e);
    }
  }

  public async exportAll(): Promise<Record<string, any[]>> {
    const backup: Record<string, any[]> = {};
    for (const table of DB_TABLES) {
      backup[table] = await this.getAll(table);
    }
    return backup;
  }

  public async importAll(data: Record<string, any[]>): Promise<void> {
    for (const table of DB_TABLES) {
      if (Array.isArray(data[table])) {
        await this.clear(table);
        await this.putMany(table, data[table]);
      }
    }
  }
}

export const indexedDb = new IndexedDbAdapter();

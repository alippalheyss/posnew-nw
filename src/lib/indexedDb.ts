/**
 * MVPOS Local-First IndexedDB Storage Engine
 * High-performance, zero-dependency async client database.
 * Eliminates browser localStorage 5MB quota restrictions and speeds up cold-starts.
 */

const DB_NAME = 'mvpos_local_db';
const DB_VERSION = 1;

export const STORES = {
  PRODUCTS: 'products',
  CUSTOMERS: 'customers',
  SALES: 'sales',
  PURCHASES: 'purchases',
  VENDORS: 'vendors',
  SETTLEMENTS: 'settlements',
  OFFLINE_QUEUE: 'offline_queue',
} as const;

type StoreName = typeof STORES[keyof typeof STORES];

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      // Products store with indexes
      if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
        const prodStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
        prodStore.createIndex('barcode', 'barcode', { unique: false });
        prodStore.createIndex('item_code', 'item_code', { unique: false });
        prodStore.createIndex('updated_at', 'updated_at', { unique: false });
      }

      // Customers store with indexes
      if (!db.objectStoreNames.contains(STORES.CUSTOMERS)) {
        const custStore = db.createObjectStore(STORES.CUSTOMERS, { keyPath: 'id' });
        custStore.createIndex('code', 'code', { unique: false });
        custStore.createIndex('phone', 'phone', { unique: false });
        custStore.createIndex('updated_at', 'updated_at', { unique: false });
      }

      // Sales store with indexes
      if (!db.objectStoreNames.contains(STORES.SALES)) {
        const salesStore = db.createObjectStore(STORES.SALES, { keyPath: 'id' });
        salesStore.createIndex('date', 'date', { unique: false });
        salesStore.createIndex('created_at', 'created_at', { unique: false });
      }

      // Purchases store
      if (!db.objectStoreNames.contains(STORES.PURCHASES)) {
        const purStore = db.createObjectStore(STORES.PURCHASES, { keyPath: 'id' });
        purStore.createIndex('date', 'date', { unique: false });
      }

      // Vendors store
      if (!db.objectStoreNames.contains(STORES.VENDORS)) {
        db.createObjectStore(STORES.VENDORS, { keyPath: 'id' });
      }

      // Settlements store
      if (!db.objectStoreNames.contains(STORES.SETTLEMENTS)) {
        const setStore = db.createObjectStore(STORES.SETTLEMENTS, { keyPath: 'id' });
        setStore.createIndex('customer_id', 'customer_id', { unique: false });
      }

      // Offline queue
      if (!db.objectStoreNames.contains(STORES.OFFLINE_QUEUE)) {
        db.createObjectStore(STORES.OFFLINE_QUEUE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve all items from a given store
 */
export async function getStoreAll<T>(storeName: StoreName): Promise<T[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as T[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`[IndexedDB] Error reading store ${storeName}:`, err);
    return [];
  }
}

/**
 * Put or replace a single item in a store
 */
export async function putStoreItem<T>(storeName: StoreName, item: T): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`[IndexedDB] Error putting item in ${storeName}:`, err);
  }
}

/**
 * Batch write items into a store (fast bulk insert/update)
 */
export async function putStoreBatch<T>(storeName: StoreName, items: T[]): Promise<void> {
  if (!items || items.length === 0) return;
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      for (const item of items) {
        store.put(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(`[IndexedDB] Error batch writing to ${storeName}:`, err);
  }
}

/**
 * Delete an item by ID
 */
export async function deleteStoreItem(storeName: StoreName, id: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`[IndexedDB] Error deleting item ${id} from ${storeName}:`, err);
  }
}

/**
 * Clear all data from an object store
 */
export async function clearStore(storeName: StoreName): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`[IndexedDB] Error clearing store ${storeName}:`, err);
  }
}

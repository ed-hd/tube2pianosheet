/**
 * IndexedDB-based model caching for Magenta Onsets and Frames
 * 
 * Caches model weights locally to speed up subsequent loads
 * First load: Download from network (~20-50MB, 2-5 seconds)
 * Subsequent loads: Load from IndexedDB (< 1 second)
 */

const DB_NAME = 'magenta-model-cache';
const DB_VERSION = 1;
const STORE_NAME = 'models';
const MODEL_KEY = 'onsets-frames-model';

interface CachedModel {
  key: string;
  timestamp: number;
  modelData: ArrayBuffer;
  weightsManifest: unknown;
}

export class ModelCache {
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
    });
  }

  async hasModel(): Promise<boolean> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(MODEL_KEY);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result !== undefined);
      };
    });
  }

  async getModel(): Promise<CachedModel | null> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(MODEL_KEY);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result || null);
      };
    });
  }

  async saveModel(modelData: ArrayBuffer, weightsManifest: unknown): Promise<void> {
    if (!this.db) await this.initialize();

    const cachedModel: CachedModel = {
      key: MODEL_KEY,
      timestamp: Date.now(),
      modelData,
      weightsManifest
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(cachedModel);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearCache(): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(MODEL_KEY);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const modelCache = new ModelCache();

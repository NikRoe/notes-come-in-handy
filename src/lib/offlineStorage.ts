// Local storage schema for offline notes
export interface OfflineNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  syncStatus: 'synced' | 'pending' | 'conflict';
  lastSyncAt?: string;
}

// Queue of operations to sync when back online
export interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  noteId: string;
  data?: Partial<OfflineNote>;
  timestamp: number;
  synced: boolean;
}

// IndexedDB wrapper for offline data storage
class OfflineStorage {
  private dbName = 'NotesOfflineDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  // Initialize IndexedDB database with notes and operations stores
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      // Create database schema on first run or version upgrade
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store for notes with indexes for querying
        if (!db.objectStoreNames.contains('notes')) {
          const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
          notesStore.createIndex('syncStatus', 'syncStatus', { unique: false });
          notesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Store for pending sync operations
        if (!db.objectStoreNames.contains('operations')) {
          const operationsStore = db.createObjectStore('operations', { keyPath: 'id' });
          operationsStore.createIndex('synced', 'synced', { unique: false });
          operationsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async saveNote(note: OfflineNote): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['notes'], 'readwrite');
      const store = transaction.objectStore('notes');
      
      const request = store.put({
        ...note,
        updatedAt: note.updatedAt || new Date().toISOString()
      });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getNote(id: string): Promise<OfflineNote | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['notes'], 'readonly');
      const store = transaction.objectStore('notes');
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllNotes(): Promise<OfflineNote[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['notes'], 'readonly');
      const store = transaction.objectStore('notes');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteNote(id: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['notes'], 'readwrite');
      const store = transaction.objectStore('notes');
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async addOperation(operation: OfflineOperation): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['operations'], 'readwrite');
      const store = transaction.objectStore('operations');
      const request = store.put(operation);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get operations that still need to be synced to server
  async getPendingOperations(): Promise<OfflineOperation[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['operations'], 'readonly');
      const store = transaction.objectStore('operations');
      
      // Use cursor to filter unsynced operations (boolean indexes can be unreliable)
      const request = store.openCursor();
      const results: OfflineOperation[] = [];
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const operation = cursor.value;
          if (operation.synced === false) {
            results.push(operation);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async markOperationSynced(id: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['operations'], 'readwrite');
      const store = transaction.objectStore('operations');
      
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const operation = getRequest.result;
        if (operation) {
          operation.synced = true;
          const putRequest = store.put(operation);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Clean up operations that have been successfully synced
  async clearSyncedOperations(): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['operations'], 'readwrite');
      const store = transaction.objectStore('operations');
      const request = store.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const operation = cursor.value;
          if (operation.synced === true) {
            cursor.delete(); // Remove synced operations to prevent buildup
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async isOnline(): Promise<boolean> {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }
}

export const offlineStorage = new OfflineStorage();
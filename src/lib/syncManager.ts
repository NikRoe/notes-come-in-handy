import { offlineStorage, OfflineNote, OfflineOperation } from './offlineStorage';
import { mutate } from 'swr';

export class SyncManager {
  private syncInProgress = false;
  private retryTimeouts = new Map<string, NodeJS.Timeout>();

  isSyncInProgress(): boolean {
    return this.syncInProgress;
  }

  async syncNotes(): Promise<void> {
    if (this.syncInProgress || !navigator.onLine) {
      return;
    }

    try {
      const pendingOperations = await offlineStorage.getPendingOperations();
      
      if (pendingOperations.length === 0) {
        return;
      }

      this.syncInProgress = true;
      
      for (const operation of pendingOperations.sort((a, b) => a.timestamp - b.timestamp)) {
        await this.syncOperation(operation);
      }

      await offlineStorage.clearSyncedOperations();
      await mutate('/api/notes');
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncOperation(operation: OfflineOperation): Promise<void> {
    try {
      let response: Response;

      switch (operation.type) {
        case 'create':
          response = await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: operation.data?.title,
              content: operation.data?.content,
              tagNames: operation.data?.tags || []
            })
          });
          break;

        case 'update':
          response = await fetch(`/api/notes/${operation.noteId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: operation.data?.title,
              content: operation.data?.content,
              tagNames: operation.data?.tags || []
            })
          });
          break;

        case 'delete':
          response = await fetch(`/api/notes/${operation.noteId}`, {
            method: 'DELETE'
          });
          break;

        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }

      if (response.ok) {
        await offlineStorage.markOperationSynced(operation.id);
        
        if (operation.type !== 'delete') {
          const syncedNote = await response.json();
          await offlineStorage.saveNote({
            ...syncedNote,
            syncStatus: 'synced',
            lastSyncAt: new Date().toISOString()
          });
        } else {
          await offlineStorage.deleteNote(operation.noteId);
        }
      } else if (response.status === 404 && operation.type === 'delete') {
        // Note already deleted, mark as synced
        await offlineStorage.markOperationSynced(operation.id);
        await offlineStorage.deleteNote(operation.noteId);
      } else if (response.status === 404 && operation.type === 'update') {
        // Note doesn't exist on server anymore, mark as synced to stop retrying
        await offlineStorage.markOperationSynced(operation.id);
        await offlineStorage.deleteNote(operation.noteId);
      } else if (response.status === 409) {
        await this.handleConflict(operation, await response.json());
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error) {
      console.error(`Failed to sync operation ${operation.id}:`, error);
      this.scheduleRetry(operation);
    }
  }

  private async handleConflict(operation: OfflineOperation, serverData: any): Promise<void> {
    
    const localNote = await offlineStorage.getNote(operation.noteId);
    if (!localNote) return;

    const conflictResolution = await this.resolveConflict(localNote, serverData);
    
    if (conflictResolution.strategy === 'local') {
      const response = await fetch(`/api/notes/${operation.noteId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Force-Update': 'true'
        },
        body: JSON.stringify({
          title: localNote.title,
          content: localNote.content,
          tagNames: localNote.tags
        })
      });
      
      if (response.ok) {
        await offlineStorage.markOperationSynced(operation.id);
        await offlineStorage.saveNote({
          ...localNote,
          syncStatus: 'synced',
          lastSyncAt: new Date().toISOString()
        });
      }
    } else {
      await offlineStorage.saveNote({
        ...serverData,
        syncStatus: 'synced',
        lastSyncAt: new Date().toISOString()
      });
      await offlineStorage.markOperationSynced(operation.id);
    }
  }

  private async resolveConflict(localNote: OfflineNote, serverNote: any): Promise<{ strategy: 'local' | 'server' }> {
    const localTime = new Date(localNote.updatedAt).getTime();
    const serverTime = new Date(serverNote.updatedAt).getTime();
    
    if (localTime > serverTime) {
      return { strategy: 'local' };
    } else {
      return { strategy: 'server' };
    }
  }

  private scheduleRetry(operation: OfflineOperation): void {
    const existingTimeout = this.retryTimeouts.get(operation.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const retryDelay = Math.min(30000, Math.pow(2, this.getRetryCount(operation)) * 1000);
    
    const timeout = setTimeout(() => {
      this.syncOperation(operation);
      this.retryTimeouts.delete(operation.id);
    }, retryDelay);

    this.retryTimeouts.set(operation.id, timeout);
  }

  private getRetryCount(operation: OfflineOperation): number {
    return Math.floor((Date.now() - operation.timestamp) / 60000);
  }

  startPeriodicSync(): void {
    setInterval(() => {
      if (navigator.onLine) {
        this.syncNotes();
      }
    }, 30000); // Sync every 30 seconds when online

    window.addEventListener('online', () => {
      this.syncNotes();
    });
  }

  async queueOperation(type: OfflineOperation['type'], noteId: string, data?: Partial<OfflineNote>): Promise<void> {
    const operation: OfflineOperation = {
      id: `${type}-${noteId}-${Date.now()}`,
      type,
      noteId,
      data,
      timestamp: Date.now(),
      synced: false
    };

    await offlineStorage.addOperation(operation);
    
    if (navigator.onLine) {
      setTimeout(() => this.syncNotes(), 1000);
    }
  }
}

export const syncManager = new SyncManager();
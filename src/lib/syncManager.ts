import {
  offlineStorage,
  OfflineNote,
  OfflineOperation,
} from "./offlineStorage";
import { mutate } from "swr";

// Manages synchronization between offline storage and server
export class SyncManager {
  private syncInProgress = false;
  private retryTimeouts = new Map<string, NodeJS.Timeout>(); // Track retry attempts

  isSyncInProgress(): boolean {
    return this.syncInProgress;
  }

  // Main sync function - processes all pending operations
  async syncNotes(): Promise<void> {
    if (this.syncInProgress || !navigator.onLine) {
      return;
    }

    try {
      this.syncInProgress = true;

      // Get fresh pending operations each time to avoid duplicates
      const pendingOperations = await offlineStorage.getPendingOperations();

      if (pendingOperations.length === 0) {
        return;
      }

      console.log(`Syncing ${pendingOperations.length} operations`);

      // Process operations in chronological order to maintain data integrity
      for (const operation of pendingOperations.sort(
        (a, b) => a.timestamp - b.timestamp
      )) {
        // Double-check operation wasn't already synced by another process
        const currentOp = await offlineStorage.getOperation(operation.id);
        if (currentOp && !currentOp.synced) {
          await this.syncOperation(operation);
        }
      }

      // Clean up completed operations and refresh UI data
      await offlineStorage.clearSyncedOperations();
      await mutate("/api/notes");
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Sync individual operation to server
  private async syncOperation(operation: OfflineOperation): Promise<void> {
    try {
      let response: Response;

      // Convert offline operation to appropriate API call
      switch (operation.type) {
        case "create":
          response = await fetch("/api/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: operation.data?.title,
              content: operation.data?.content,
              tagNames: operation.data?.tags || [],
            }),
          });
          break;

        case "update":
          response = await fetch(`/api/notes/${operation.noteId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: operation.data?.title,
              content: operation.data?.content,
              tagNames: operation.data?.tags || [],
            }),
          });
          break;

        case "delete":
          response = await fetch(`/api/notes/${operation.noteId}`, {
            method: "DELETE",
          });
          break;

        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }

      // Handle different response scenarios
      if (response.ok) {
        await offlineStorage.markOperationSynced(operation.id);

        if (operation.type !== "delete") {
          // Update local storage with server response
          const syncedNote = await response.json();

          // If this was a temp note, delete the old temp version first
          if (operation.noteId.startsWith("temp-")) {
            await offlineStorage.deleteNote(operation.noteId);
          }

          await offlineStorage.saveNote({
            ...syncedNote,
            tags:
              syncedNote.tags?.map(
                (tagRelation: { tag: { name: string } }) => tagRelation.tag.name
              ) || [],
            syncStatus: "synced",
            lastSyncAt: new Date().toISOString(),
          });
        } else {
          await offlineStorage.deleteNote(operation.noteId);
        }
      } else if (response.status === 404 && operation.type === "delete") {
        // Note already deleted on server, nothing to do
        await offlineStorage.markOperationSynced(operation.id);
        await offlineStorage.deleteNote(operation.noteId);
      } else if (response.status === 404 && operation.type === "update") {
        // Note no longer exists on server, remove locally too
        await offlineStorage.markOperationSynced(operation.id);
        await offlineStorage.deleteNote(operation.noteId);
      } else if (response.status === 409) {
        // Handle data conflicts
        await this.handleConflict(operation, await response.json());
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error) {
      console.error(`Failed to sync operation ${operation.id}:`, error);
      this.scheduleRetry(operation);
    }
  }

  // Handle data conflicts between local and server versions
  private async handleConflict(
    operation: OfflineOperation,
    serverData: {
      id: string;
      title: string;
      content: string;
      createdAt: string;
      updatedAt: string;
      tags: { tag: { name: string } }[];
    }
  ): Promise<void> {
    const localNote = await offlineStorage.getNote(operation.noteId);
    if (!localNote) return;

    const conflictResolution = await this.resolveConflict(
      localNote,
      serverData
    );

    if (conflictResolution.strategy === "local") {
      // Force local version to server
      const response = await fetch(`/api/notes/${operation.noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Force-Update": "true",
        },
        body: JSON.stringify({
          title: localNote.title,
          content: localNote.content,
          tagNames: localNote.tags,
        }),
      });

      if (response.ok) {
        await offlineStorage.markOperationSynced(operation.id);
        await offlineStorage.saveNote({
          ...localNote,
          syncStatus: "synced",
          lastSyncAt: new Date().toISOString(),
        });
      }
    } else {
      // Accept server version
      await offlineStorage.saveNote({
        ...serverData,
        tags: serverData.tags.map(({ tag }) => tag.name),
        syncStatus: "synced",
        lastSyncAt: new Date().toISOString(),
      });
      await offlineStorage.markOperationSynced(operation.id);
    }
  }

  // Simple conflict resolution: latest timestamp wins
  private async resolveConflict(
    localNote: OfflineNote,
    serverNote: { updatedAt: string }
  ): Promise<{ strategy: "local" | "server" }> {
    const localTime = new Date(localNote.updatedAt).getTime();
    const serverTime = new Date(serverNote.updatedAt).getTime();

    return localTime > serverTime
      ? { strategy: "local" }
      : { strategy: "server" };
  }

  // Schedule retry with exponential backoff for failed operations
  private scheduleRetry(operation: OfflineOperation): void {
    const existingTimeout = this.retryTimeouts.get(operation.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Exponential backoff: 1s, 2s, 4s, 8s... max 30s
    const retryDelay = Math.min(
      30000,
      Math.pow(2, this.getRetryCount(operation)) * 1000
    );

    const timeout = setTimeout(() => {
      this.syncOperation(operation);
      this.retryTimeouts.delete(operation.id);
    }, retryDelay);

    this.retryTimeouts.set(operation.id, timeout);
  }

  private getRetryCount(operation: OfflineOperation): number {
    return Math.floor((Date.now() - operation.timestamp) / 60000); // Rough retry count based on age
  }

  // Start automatic sync processes
  startPeriodicSync(): void {
    // Sync every 30 seconds when online
    setInterval(() => {
      if (navigator.onLine) {
        this.syncNotes();
      }
    }, 30000);

    // Immediate sync when coming back online
    window.addEventListener("online", () => {
      this.syncNotes();
    });
  }

  // Queue an operation for sync when back online
  async queueOperation(
    type: OfflineOperation["type"],
    noteId: string,
    data?: Partial<OfflineNote>
  ): Promise<void> {
    const operation: OfflineOperation = {
      id: `${type}-${noteId}-${Date.now()}`,
      type,
      noteId,
      data,
      timestamp: Date.now(),
      synced: false,
    };

    await offlineStorage.addOperation(operation);

    // Try to sync immediately if online (with small delay to batch operations)
    if (navigator.onLine) {
      setTimeout(() => this.syncNotes(), 2000);
    }
  }
}

export const syncManager = new SyncManager();

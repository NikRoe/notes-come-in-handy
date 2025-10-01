import { useState, useEffect, useCallback } from "react";
import useSWR, { mutate } from "swr";
import { offlineStorage, OfflineNote } from "@/lib/offlineStorage";
import { syncManager } from "@/lib/syncManager";

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags: {
    tag: {
      id: string;
      name: string;
      color: string;
    };
  }[];
}

const fetcher = (url: string) => fetch(url).then((response) => response.json());

export function useOfflineNotes(isAuthenticated: boolean) {
  const [isOnline, setIsOnline] = useState(true);
  const [offlineNotes, setOfflineNotes] = useState<OfflineNote[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const {
    data: onlineNotes = [],
    error,
    isValidating,
  } = useSWR<Note[]>(isAuthenticated ? "/api/notes" : null, fetcher);

  useEffect(() => {
    // Set initial online status on client side
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadOfflineNotes();
      syncManager.startPeriodicSync();
    }
  }, [isAuthenticated]);

  const syncOnlineNotesToOffline = useCallback(async (notes: Note[]) => {
    try {
      // Clean up old temp notes first
      const allOfflineNotes = await offlineStorage.getAllNotes();
      for (const offlineNote of allOfflineNotes) {
        if (offlineNote.id.startsWith("temp-")) {
          await offlineStorage.deleteNote(offlineNote.id);
        }
      }

      for (const note of notes) {
        const offlineNote: OfflineNote = {
          id: note.id,
          title: note.title,
          content: note.content,
          tags: note.tags.map(({ tag }) => tag.name),
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          syncStatus: "synced", // Always mark as synced since they come from server
          lastSyncAt: new Date().toISOString(),
        };

        await offlineStorage.saveNote(offlineNote);
      }

      await loadOfflineNotes();
    } catch (error) {
      console.error("Failed to sync online notes to offline storage:", error);
    }
  }, []);

  useEffect(() => {
    if (isOnline && onlineNotes.length > 0) {
      syncOnlineNotesToOffline(onlineNotes);
    }
  }, [isOnline, onlineNotes, syncOnlineNotesToOffline]); // syncOnlineNotesToOffline is stable, no need to add to deps

  const loadOfflineNotes = async () => {
    try {
      const notes = await offlineStorage.getAllNotes();
      setOfflineNotes(notes);
    } catch (error) {
      console.error("Failed to load offline notes:", error);
    }
  };

  const createNote = async (noteData: {
    title: string;
    content: string;
    tags: string[];
  }) => {
    const tempId = `temp-${Date.now()}`;
    const newNote: OfflineNote = {
      id: tempId,
      title: noteData.title,
      content: noteData.content,
      tags: noteData.tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: "pending",
    };

    try {
      if (isOnline) {
        // Create directly on server when online
        setIsSyncing(true);
        try {
          const response = await fetch("/api/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: noteData.title,
              content: noteData.content,
              tagNames: noteData.tags,
            }),
          });

          if (response.ok) {
            const createdNote = await response.json();
            await offlineStorage.saveNote({
              ...createdNote,
              tags:
                createdNote.tags?.map(
                  (tagRelation: { tag: { name: string } }) =>
                    tagRelation.tag.name
                ) || [],
              syncStatus: "synced",
              lastSyncAt: new Date().toISOString(),
            });
            await loadOfflineNotes();
            mutate("/api/notes");
          } else {
            throw new Error(`Server error: ${response.status}`);
          }
        } finally {
          setIsSyncing(false);
        }
      } else {
        // Save for later sync when offline
        await offlineStorage.saveNote(newNote);
        await syncManager.queueOperation("create", tempId, newNote);
        await loadOfflineNotes();
      }
    } catch (error) {
      console.error("Failed to create note:", error);
      setIsSyncing(false);
      throw error;
    }
  };

  const updateNote = async (
    id: string,
    noteData: { title: string; content: string; tags: string[] }
  ) => {
    const updatedNote: Partial<OfflineNote> = {
      title: noteData.title,
      content: noteData.content,
      tags: noteData.tags,
      updatedAt: new Date().toISOString(),
      syncStatus: "pending",
    };

    try {
      if (isOnline) {
        // Update directly on server when online
        setIsSyncing(true);
        try {
          const response = await fetch(`/api/notes/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: noteData.title,
              content: noteData.content,
              tagNames: noteData.tags,
            }),
          });

          if (response.ok) {
            const updated = await response.json();
            await offlineStorage.saveNote({
              ...updated,
              tags:
                updated.tags?.map(
                  (tagRelation: { tag: { name: string } }) =>
                    tagRelation.tag.name
                ) || [],
              syncStatus: "synced",
              lastSyncAt: new Date().toISOString(),
            });
            await loadOfflineNotes();
            mutate("/api/notes");
          } else {
            throw new Error(`Server error: ${response.status}`);
          }
        } finally {
          setIsSyncing(false);
        }
      } else {
        // Save for later sync when offline
        const existingNote = await offlineStorage.getNote(id);
        if (existingNote) {
          await offlineStorage.saveNote({ ...existingNote, ...updatedNote });
          await syncManager.queueOperation("update", id, updatedNote);
          await loadOfflineNotes();
        }
      }
    } catch (error) {
      console.error("Failed to update note:", error);
      throw error;
    }
  };

  const deleteNote = async (id: string) => {
    try {
      if (isOnline) {
        // Delete directly on server when online
        setIsSyncing(true);
        try {
          const response = await fetch(`/api/notes/${id}`, {
            method: "DELETE",
          });

          if (response.ok) {
            await offlineStorage.deleteNote(id);
            await loadOfflineNotes();
            mutate("/api/notes");
          } else if (response.status === 404) {
            // Note already deleted on server, just remove locally
            await offlineStorage.deleteNote(id);
            await loadOfflineNotes();
            mutate("/api/notes");
          } else {
            throw new Error(`Server error: ${response.status}`);
          }
        } finally {
          setIsSyncing(false);
        }
      } else {
        // Queue for later sync when offline
        await offlineStorage.deleteNote(id);
        await syncManager.queueOperation("delete", id);
        await loadOfflineNotes();
      }
    } catch (error) {
      console.error("Failed to delete note:", error);
      throw error;
    }
  };

  const notes =
    isOnline && !error
      ? onlineNotes
      : offlineNotes.map((note) => ({
          id: note.id,
          title: note.title,
          content: note.content,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          tags: note.tags.map((tagName) => ({
            tag: {
              id: tagName,
              name: tagName,
              color: "#6366f1",
            },
          })),
        }));

  return {
    notes,
    error: error && !isOnline ? null : error,
    isValidating,
    isOnline,
    createNote,
    updateNote,
    deleteNote,
    syncStatus:
      isSyncing || offlineNotes.some((note) => note.syncStatus === "pending")
        ? ("pending" as const)
        : ("synced" as const),
  };
}

import { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { offlineStorage, OfflineNote } from '@/lib/offlineStorage';
import { syncManager } from '@/lib/syncManager';

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

  const {
    data: onlineNotes = [],
    error,
    isValidating
  } = useSWR<Note[]>(isAuthenticated ? '/api/notes' : null, fetcher);

  useEffect(() => {
    // Set initial online status on client side
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadOfflineNotes();
      syncManager.startPeriodicSync();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isOnline && onlineNotes.length > 0) {
      syncOnlineNotesToOffline(onlineNotes);
    }
  }, [isOnline, onlineNotes]);

  const loadOfflineNotes = async () => {
    try {
      const notes = await offlineStorage.getAllNotes();
      setOfflineNotes(notes);
    } catch (error) {
      console.error('Failed to load offline notes:', error);
    }
  };

  const syncOnlineNotesToOffline = async (notes: Note[]) => {
    try {
      for (const note of notes) {
        const offlineNote: OfflineNote = {
          id: note.id,
          title: note.title,
          content: note.content,
          tags: note.tags.map(({ tag }) => tag.name),
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          syncStatus: 'synced',
          lastSyncAt: new Date().toISOString()
        };
        
        await offlineStorage.saveNote(offlineNote);
      }
      
      await loadOfflineNotes();
    } catch (error) {
      console.error('Failed to sync online notes to offline storage:', error);
    }
  };

  const createNote = async (noteData: { title: string; content: string; tags: string[] }) => {
    const tempId = `temp-${Date.now()}`;
    const newNote: OfflineNote = {
      id: tempId,
      title: noteData.title,
      content: noteData.content,
      tags: noteData.tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending'
    };

    try {
      await offlineStorage.saveNote(newNote);
      await syncManager.queueOperation('create', tempId, newNote);
      await loadOfflineNotes();

      if (isOnline) {
        const response = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: noteData.title,
            content: noteData.content,
            tagNames: noteData.tags
          })
        });

        if (response.ok) {
          const createdNote = await response.json();
          await offlineStorage.deleteNote(tempId);
          await offlineStorage.saveNote({
            ...createdNote,
            tags: createdNote.tags?.map(({ tag }: any) => tag.name) || [],
            syncStatus: 'synced',
            lastSyncAt: new Date().toISOString()
          });
          await loadOfflineNotes();
          mutate('/api/notes');
        }
      }
    } catch (error) {
      console.error('Failed to create note:', error);
      throw error;
    }
  };

  const updateNote = async (id: string, noteData: { title: string; content: string; tags: string[] }) => {
    const updatedNote: Partial<OfflineNote> = {
      title: noteData.title,
      content: noteData.content,
      tags: noteData.tags,
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending'
    };

    try {
      const existingNote = await offlineStorage.getNote(id);
      if (existingNote) {
        await offlineStorage.saveNote({ ...existingNote, ...updatedNote });
        await syncManager.queueOperation('update', id, updatedNote);
        await loadOfflineNotes();
      }

      if (isOnline) {
        const response = await fetch(`/api/notes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: noteData.title,
            content: noteData.content,
            tagNames: noteData.tags
          })
        });

        if (response.ok) {
          const updated = await response.json();
          await offlineStorage.saveNote({
            ...updated,
            tags: updated.tags?.map(({ tag }: any) => tag.name) || [],
            syncStatus: 'synced',
            lastSyncAt: new Date().toISOString()
          });
          await loadOfflineNotes();
          mutate('/api/notes');
        }
      }
    } catch (error) {
      console.error('Failed to update note:', error);
      throw error;
    }
  };

  const deleteNote = async (id: string) => {
    try {
      await offlineStorage.deleteNote(id);
      await syncManager.queueOperation('delete', id);
      await loadOfflineNotes();

      if (isOnline) {
        const response = await fetch(`/api/notes/${id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          mutate('/api/notes');
        }
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
      throw error;
    }
  };

  const notes = isOnline && !error ? onlineNotes : offlineNotes.map(note => ({
    id: note.id,
    title: note.title,
    content: note.content,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    tags: note.tags.map(tagName => ({
      tag: {
        id: tagName,
        name: tagName,
        color: '#6366f1'
      }
    }))
  }));

  return {
    notes,
    error: error && !isOnline ? null : error,
    isValidating,
    isOnline,
    createNote,
    updateNote,
    deleteNote,
    syncStatus: offlineNotes.some(note => note.syncStatus === 'pending') ? 'pending' as const : 'synced' as const
  };
}
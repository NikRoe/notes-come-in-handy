import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'
import { useRouter } from 'next/router'
import useSWR, { mutate } from 'swr'

interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

const fetcher = (url: string) => fetch(url).then((response) => response.json())

export default function NotesPage() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newNote, setNewNote] = useState({ title: '', content: '' })

  const { data: notes = [], error, isValidating } = useSWR<Note[]>(
    isAuthenticated ? '/api/notes' : null,
    fetcher
  )

  if (!isLoading && !isAuthenticated) {
    router.push('/')
    return null
  }

  const createNote = async () => {
    if (!newNote.title.trim() || !newNote.content.trim()) return

    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNote),
      })

      if (response.ok) {
        const createdNote = await response.json()
        // Optimistic update
        mutate('/api/notes', [createdNote, ...notes], false)
        setNewNote({ title: '', content: '' })
        setIsDialogOpen(false)
        // Revalidate to ensure consistency
        mutate('/api/notes')
      }
    } catch (error) {
      console.error('Failed to create note:', error)
    }
  }

  const deleteNote = async (id: string) => {
    try {
      const response = await fetch(`/api/notes/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Optimistic update
        mutate('/api/notes', notes.filter(note => note.id !== id), false)
        // Revalidate to ensure consistency
        mutate('/api/notes')
      }
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  }

  if (isLoading || (isAuthenticated && !notes && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">My Notes</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>New Note</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Note</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Note title"
                  value={newNote.title}
                  onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                />
                <Textarea
                  placeholder="Note content"
                  value={newNote.content}
                  onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                  rows={6}
                />
                <Button onClick={createNote} className="w-full">
                  Create Note
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {notes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground mb-4">No notes yet</p>
              <Button onClick={() => setIsDialogOpen(true)}>Create your first note</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {notes.map((note) => (
              <Card key={note.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg line-clamp-2">{note.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-3 mb-4">
                    {note.content}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </span>
                    <div className="space-x-2">
                      <Link href={`/notes/${note.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => deleteNote(note.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
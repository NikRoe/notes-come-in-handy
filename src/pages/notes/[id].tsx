import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useRouter } from 'next/router'
import useSWR, { mutate } from 'swr'
import Link from 'next/link'

interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

const fetcher = (url: string) => fetch(url).then((response) => response.json())

export default function NotePage() {
  const { isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const { id } = router.query
  const [isEditing, setIsEditing] = useState(false)
  const [editedNote, setEditedNote] = useState({ title: '', content: '' })

  const { data: note, error } = useSWR<Note>(
    isAuthenticated && id ? `/api/notes/${id}` : null,
    fetcher
  )

  if (!isLoading && !isAuthenticated) {
    router.push('/')
    return null
  }

  const startEditing = () => {
    if (note) {
      setEditedNote({ title: note.title, content: note.content })
      setIsEditing(true)
    }
  }

  const saveNote = async () => {
    if (!editedNote.title.trim() || !editedNote.content.trim()) return

    try {
      const response = await fetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedNote),
      })

      if (response.ok) {
        const updatedNote = await response.json()
        // Update the cache
        mutate(`/api/notes/${id}`, updatedNote, false)
        // Also update the notes list cache
        mutate('/api/notes')
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Failed to update note:', error)
    }
  }

  const deleteNote = async () => {
    try {
      const response = await fetch(`/api/notes/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Update the notes list cache
        mutate('/api/notes')
        router.push('/notes')
      }
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  }

  if (isLoading || (isAuthenticated && !note && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (error || !note) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">Note not found</p>
            <Link href="/notes">
              <Button>Back to Notes</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href="/notes">
            <Button variant="outline">← Back to Notes</Button>
          </Link>
          <div className="space-x-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={saveNote}>Save</Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={startEditing}>
                  Edit
                </Button>
                <Button variant="destructive" onClick={deleteNote}>
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            {isEditing ? (
              <Input
                value={editedNote.title}
                onChange={(e) => setEditedNote(prev => ({ ...prev, title: e.target.value }))}
                className="text-2xl font-bold border-none p-0 focus-visible:ring-0"
                placeholder="Note title"
              />
            ) : (
              <CardTitle className="text-2xl">{note.title}</CardTitle>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <Textarea
                value={editedNote.content}
                onChange={(e) => setEditedNote(prev => ({ ...prev, content: e.target.value }))}
                rows={20}
                className="min-h-96"
                placeholder="Note content"
              />
            ) : (
              <div className="whitespace-pre-wrap text-foreground">
                {note.content}
              </div>
            )}
            <div className="text-sm text-muted-foreground border-t pt-4">
              <p>Created: {new Date(note.createdAt).toLocaleString()}</p>
              <p>Updated: {new Date(note.updatedAt).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
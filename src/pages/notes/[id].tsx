import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/router";
import useSWR, { mutate } from "swr";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { TagInput } from "@/components/TagInput";
import { Tag } from "@/components/Tag";
import { Header } from "@/components/Header";

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

export default function NotePage() {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [isEditing, setIsEditing] = useState(false);
  const [editedNote, setEditedNote] = useState({ title: "", content: "", tags: [] as string[] });

  const { data: note, error } = useSWR<Note>(
    isAuthenticated && id ? `/api/notes/${id}` : null,
    fetcher
  );

  if (!isLoading && !isAuthenticated) {
    router.push("/");
    return null;
  }

  const startEditing = () => {
    if (note) {
      setEditedNote({ 
        title: note.title, 
        content: note.content,
        tags: note.tags?.map(({ tag }) => tag.name) || []
      });
      setIsEditing(true);
    }
  };

  const saveNote = async () => {
    if (!editedNote.title.trim() || !editedNote.content.trim()) return;

    try {
      const response = await fetch(`/api/notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editedNote.title,
          content: editedNote.content,
          tagNames: editedNote.tags
        }),
      });

      if (response.ok) {
        const updatedNote = await response.json();
        // Update the cache
        mutate(`/api/notes/${id}`, updatedNote, false);
        // Also update the notes list cache
        mutate("/api/notes");
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Failed to update note:", error);
    }
  };

  const deleteNote = async () => {
    try {
      const response = await fetch(`/api/notes/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Update the notes list cache
        mutate("/api/notes");
        router.push("/notes");
      }
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };

  if (isLoading || (isAuthenticated && !note && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
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
    );
  }

  return (
    <main className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <Header title={note.title} className="mb-6" />
        
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6" aria-label="Note navigation and actions">
          <Link href="/notes">
            <Button variant="outline" className="w-fit">← Back to Notes</Button>
          </Link>
          <div className="flex flex-wrap gap-2 sm:space-x-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1 sm:flex-none">
                  Cancel
                </Button>
                <Button variant="outline" onClick={saveNote} className="flex-1 sm:flex-none">
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={startEditing} className="flex-1 sm:flex-none">
                  Edit
                </Button>
                <Button variant="destructive" onClick={deleteNote} className="flex-1 sm:flex-none">
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>

        <article>
          <Card>
            <CardHeader>
              {isEditing ? (
                <>
                  <label htmlFor="note-title-edit" className="sr-only">Note title</label>
                  <Input
                    id="note-title-edit"
                    value={editedNote.title}
                    onChange={(e) =>
                      setEditedNote((prev) => ({ ...prev, title: e.target.value }))
                    }
                    className="text-2xl font-bold border-none p-0 focus-visible:ring-0"
                    placeholder="Note title"
                  />
                </>
              ) : (
                <CardTitle className="text-2xl">{note.title}</CardTitle>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <form className="space-y-4">
                  <MarkdownEditor
                    value={editedNote.content}
                    onChange={(content) =>
                      setEditedNote((prev) => ({ ...prev, content }))
                    }
                    placeholder="Edit your note in Markdown..."
                    rows={20}
                  />
                  <TagInput
                    tags={editedNote.tags}
                    onTagsChange={(tags) =>
                      setEditedNote((prev) => ({ ...prev, tags }))
                    }
                    placeholder="Edit tags (press Enter to add)..."
                  />
                </form>
              ) : (
                <>
                  <div className="text-foreground bg-muted/20 p-4 rounded-md border prose prose-sm max-w-none prose-neutral dark:prose-invert" role="document">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {note.content}
                    </ReactMarkdown>
                  </div>
                  {note.tags && note.tags.length > 0 && (
                    <aside>
                      <h2 className="text-sm font-medium mb-2 text-muted-foreground">Tags</h2>
                      <ul className="flex flex-wrap gap-2">
                        {note.tags.map(({ tag }) => (
                          <li key={tag.id}>
                            <Tag name={tag.name} color={tag.color} />
                          </li>
                        ))}
                      </ul>
                    </aside>
                  )}
                </>
              )}
              <footer className="text-sm text-muted-foreground border-t pt-4">
                <dl>
                  <dt className="sr-only">Created</dt>
                  <dd>Created: <time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleString()}</time></dd>
                  <dt className="sr-only">Updated</dt>
                  <dd>Updated: <time dateTime={note.updatedAt}>{new Date(note.updatedAt).toLocaleString()}</time></dd>
                </dl>
              </footer>
            </CardContent>
          </Card>
        </article>
      </div>
    </main>
  );
}

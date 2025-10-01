import { useState, useMemo } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/router";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { SearchBar } from "@/components/SearchBar";
import { TagInput } from "@/components/TagInput";
import { Tag } from "@/components/Tag";
import { Header } from "@/components/Header";
import { useOfflineNotes } from "@/hooks/useOfflineNotes";

export default function NotesPage() {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState({
    title: "",
    content: "",
    tags: [] as string[],
  });
  const [searchQuery, setSearchQuery] = useState("");

  const {
    notes,
    error,
    createNote: createOfflineNote,
    deleteNote: deleteOfflineNote,
    syncStatus,
  } = useOfflineNotes(isAuthenticated);

  const filteredNotes = useMemo(() => {
    if (error || !Array.isArray(notes)) return [];
    if (!searchQuery.trim()) return notes;

    const query = searchQuery.toLowerCase();
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query)
    );
  }, [notes, searchQuery, error]);

  if (!isLoading && !isAuthenticated) {
    router.push("/");
    return null;
  }

  function handleSearch(query: string) {
    setSearchQuery(query);
  }

  const createNote = async () => {
    if (!newNote.title.trim() || !newNote.content.trim()) return;

    try {
      await createOfflineNote({
        title: newNote.title,
        content: newNote.content,
        tags: newNote.tags,
      });
      setNewNote({ title: "", content: "", tags: [] });
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  };

  const deleteNote = async (id: string) => {
    try {
      await deleteOfflineNote(id);
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };

  if (isLoading || (isAuthenticated && !notes && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-destructive mb-4">Failed to load notes</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col gap-4 mb-6">
          <Header title="My Notes" syncStatus={syncStatus} />

          <div className="flex justify-end" aria-label="Note actions">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  New Note
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-lg sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">
                    Create New Note
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 flex flex-col">
                  <Input
                    placeholder="Note title"
                    value={newNote.title}
                    onChange={(e) =>
                      setNewNote((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                  />
                  <MarkdownEditor
                    value={newNote.content}
                    onChange={(content) =>
                      setNewNote((prev) => ({ ...prev, content }))
                    }
                    placeholder="Write your note in Markdown..."
                    rows={12}
                  />
                  <TagInput
                    tags={newNote.tags}
                    onTagsChange={(tags) =>
                      setNewNote((prev) => ({ ...prev, tags }))
                    }
                    placeholder="Add tags (press Enter to add)..."
                  />
                  <Button
                    onClick={createNote}
                    variant="outline"
                    className="self-center"
                  >
                    Create Note
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <SearchBar
            onSearch={handleSearch}
            searchQuery={searchQuery}
            placeholder="Search notes by title or content..."
          />
        </div>

        {notes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground mb-4">No notes yet</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                Create your first note
              </Button>
            </CardContent>
          </Card>
        ) : filteredNotes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No notes found matching your search
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredNotes?.map((note) => (
              <Card
                key={note.id}
                className="justify-between hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <CardTitle className="text-lg line-clamp-2">
                    {note.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-3 mb-4">
                    {note.content.replace(/[#*_~`]/g, "").substring(0, 150)}...
                  </p>
                  {note.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {note.tags.map(({ tag }) => (
                        <Tag key={tag.id} name={tag.name} color={tag.color} />
                      ))}
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2 min-w-0">
                      <Link
                        href={`/notes/${note.id}`}
                        className="flex-1 sm:flex-none"
                      >
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full sm:w-auto text-xs px-2"
                        >
                          View
                        </Button>
                      </Link>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteNote(note.id)}
                        className="flex-1 sm:flex-none text-xs px-2"
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
    </main>
  );
}

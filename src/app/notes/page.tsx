"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { notesStore, type Note } from "@/lib/notes-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageScroll } from "@/components/ui/page-scroll";
import { cn } from "@/lib/utils";
import { Plus, ExternalLink, Pencil, Trash2, StickyNote, Bookmark } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

// ─── Helpers ────────────────────────────────────────────────────────────

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const mdPreviewStyles =
  "min-h-[80px] max-h-[400px] overflow-y-auto rounded-md border p-3 text-sm leading-relaxed " +
  "[&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-bold " +
  "[&_h2]:mb-1.5 [&_h2]:text-base [&_h2]:font-semibold " +
  "[&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold " +
  "[&_p]:mb-2 [&_p:last-child]:mb-0 " +
  "[&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 " +
  "[&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 " +
  "[&_li]:mb-1 [&_li:last-child]:mb-0 " +
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs " +
  "[&_pre]:mb-2 [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 " +
  "[&_blockquote]:mb-2 [&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground " +
  "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 " +
  "[&_table]:mb-2 [&_table]:w-full [&_table]:border-collapse " +
  "[&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold " +
  "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_td]:text-xs " +
  "[&_hr]:my-3 [&_hr]:border-border " +
  "[&_input[type=checkbox]]:accent-primary";

// ─── Page ────────────────────────────────────────────────────────────────

export default function NotesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [deleteNote, setDeleteNote] = useState<Note | null>(null);
  const [showBookmarked, setShowBookmarked] = useState(false);
  const [draft, setDraft] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filteredNotes = showBookmarked ? notes.filter((n) => n.bookmarked) : notes;

  const dialogOpen = createOpen || editNote !== null;

  function loadNotes() {
    setNotes([...notesStore.getAll()]);
  }

  useEffect(() => {
    notesStore.load().finally(() => {
      loadNotes();
      setLoading(false);
    });
  }, []);

  // Re-subscribe to store updates
  useEffect(() => {
    const unsub = notesStore.subscribe(() => {
      loadNotes();
    });
    return unsub;
  }, []);

  // Focus textarea when dialog opens
  useEffect(() => {
    if (dialogOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [dialogOpen]);

  async function handleSave() {
    const text = draft.trim();
    if (!text) return;
    if (editNote) {
      await notesStore.update(editNote.id, text);
    } else {
      await notesStore.add(text);
    }
    setDraft("");
    setCreateOpen(false);
    setEditNote(null);
    setPreviewMode(false);
  }

  function handleEdit(note: Note) {
    setEditNote(note);
    setDraft(note.text);
    setPreviewMode(false);
  }

  async function handleDelete() {
    if (!deleteNote) return;
    await notesStore.remove(deleteNote.id);
    setDeleteNote(null);
  }

  function handleCreateOpen() {
    setDraft("");
    setEditNote(null);
    setCreateOpen(true);
    setPreviewMode(false);
  }

  function handleDialogClose() {
    setCreateOpen(false);
    setEditNote(null);
    setDraft("");
    setPreviewMode(false);
  }

  return (
    <PageScroll
      header={
        <div className="flex items-center justify-between bg-background px-5 py-2 rounded-xl shadow-sm border">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Notes
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {showBookmarked
                ? `${filteredNotes.length} bookmarked`
                : `${notes.length} note${notes.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showBookmarked ? "default" : "outline"}
              size="sm"
              onClick={() => setShowBookmarked((v) => !v)}
            >
              <Bookmark
                className={showBookmarked ? "mr-1 size-3.5 fill-current" : "mr-1 size-3.5"}
              />
              Bookmarked
            </Button>
            <Button size="sm" onClick={handleCreateOpen}>
              <Plus className="mr-1 size-3.5" />
              New Note
            </Button>
          </div>
        </div>
      }
      maxWidth="max-w-3xl"
      scrollContentClass="space-y-4 pt-6"
    >
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <StickyNote className="mb-3 size-10 text-muted-foreground/40" />
          <p className="text-lg font-medium text-muted-foreground">
            {showBookmarked ? "No bookmarked notes" : "No notes yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {showBookmarked
              ? "Bookmark notes to find them quickly"
              : "Write your first note to get started"}
          </p>
          {!showBookmarked && (
            <Button className="mt-4" onClick={handleCreateOpen}>
              <Plus className="mr-1 size-3.5" />
              Create Note
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="group relative rounded-xl border bg-card p-4 transition-colors hover:bg-accent/30"
            >
              {/* Top row: timestamp + actions */}
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {formatTime(note.createdAt)}
                </span>
                <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      notesStore.toggleBookmark(note.id);
                    }}
                    aria-label={note.bookmarked ? "Remove bookmark" : "Bookmark note"}
                  >
                    <Bookmark
                      className={cn(
                        "size-3.5",
                        note.bookmarked && "fill-current text-yellow-500",
                      )}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => router.push(`/notes/${note.id}`)}
                    aria-label="Open note"
                  >
                    <ExternalLink className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => handleEdit(note)}
                    aria-label="Edit note"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive"
                    onClick={() => setDeleteNote(note)}
                    aria-label="Delete note"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              {/* Note content — first 5 lines with fade */}
              <div className="relative max-h-[7.5rem] overflow-hidden text-sm leading-relaxed [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_60%,transparent_100%)] [mask-image:linear-gradient(to_bottom,black_0%,black_60%,transparent_100%)]">
                <div className={mdPreviewStyles.replace("max-h-[400px]", "max-h-none").replace("min-h-[80px]", "min-h-0").replace("rounded-md border p-3", "p-0 border-0 rounded-none")}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeSanitize]}
                  >
                    {note.text}
                  </ReactMarkdown>
                </div>
              </div>

              {/* "Read more" link */}
              {note.text.length > 200 && (
                <button
                  onClick={() => router.push(`/notes/${note.id}`)}
                  className="mt-1 text-xs font-medium text-primary hover:underline"
                >
                  Read more →
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editNote ? "Edit Note" : "New Note"}</DialogTitle>
            <DialogDescription>
              {editNote
                ? "Update your note."
                : "Write down a quick thought or reminder."}
            </DialogDescription>
          </DialogHeader>

          {/* Write / Preview toggle */}
          <div className="flex gap-0 border-b">
            <button
              type="button"
              onClick={() => setPreviewMode(false)}
              className={cn(
                "px-4 py-1.5 text-xs font-medium transition-colors",
                !previewMode
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Write
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode(true)}
              className={cn(
                "px-4 py-1.5 text-xs font-medium transition-colors",
                previewMode
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Preview
            </button>
          </div>

          {previewMode ? (
            <div className={mdPreviewStyles}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize]}
              >
                {draft || "*No content*"}
              </ReactMarkdown>
            </div>
          ) : (
            <Textarea
              ref={textareaRef}
              placeholder="Type your note...  (Markdown supported)"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-h-[200px] resize-y"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSave();
                }
              }}
            />
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleDialogClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!draft.trim()}>
              {editNote ? "Save" : "Add Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteNote}
        onOpenChange={(o) => !o && setDeleteNote(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Note</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete this note? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteNote(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageScroll>
  );
}

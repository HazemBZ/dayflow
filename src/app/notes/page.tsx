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
import { Plus, ExternalLink, Pencil, Trash2, StickyNote, Bookmark, Archive, ArchiveRestore } from "lucide-react";
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
  const [showArchived, setShowArchived] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [draft, setDraft] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Derive all unique tags across notes
  const allTags = [...new Set(notes.flatMap((n) => n.tags))].sort();

  const baseNotes = showArchived ? notes.filter((n) => n.archived) : notes.filter((n) => !n.archived);
  const tagFiltered = selectedTags.length > 0
    ? baseNotes.filter((n) => selectedTags.some((t) => n.tags.includes(t)))
    : baseNotes;
  const filteredNotes = showBookmarked ? tagFiltered.filter((n) => n.bookmarked) : tagFiltered;

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
              {showArchived
                ? `${filteredNotes.length} archived`
                : showBookmarked
                  ? `${filteredNotes.length} bookmarked`
                  : `${filteredNotes.length} note${filteredNotes.length !== 1 ? "s" : ""}`}
              {selectedTags.length > 0 && (
                <span className="ml-1.5">
                  · tagged with <span className="font-medium">{selectedTags.join(", ")}</span>
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => setShowArchived((v) => !v)}
            >
              <Archive className={showArchived ? "mr-1 size-3.5" : "mr-1 size-3.5"} />
              Archived
            </Button>
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
      {/* Tags filter */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          {/* Dropdown toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTagDropdown((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full border border-input bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {selectedTags.length === 0 ? "All tags" : `Tags (${selectedTags.length})`}
              <svg
                className={cn("size-3 transition-transform", showTagDropdown && "rotate-180")}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showTagDropdown && (
              <>
                {/* Backdrop to close */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowTagDropdown(false)}
                />
                <div className="absolute left-0 top-full z-20 mt-1 w-44 rounded-lg border bg-popover p-1.5 shadow-md">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTags([]);
                      setShowTagDropdown(false);
                    }}
                    className={cn(
                      "flex w-full items-center rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                      selectedTags.length === 0
                        ? "bg-primary text-primary-foreground"
                        : "text-popover-foreground hover:bg-muted",
                    )}
                  >
                    All tags
                  </button>
                  {allTags.map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setSelectedTags((prev) =>
                            prev.includes(tag)
                              ? prev.filter((t) => t !== tag)
                              : [...prev, tag],
                          );
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors",
                          active
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-popover-foreground hover:bg-muted",
                        )}
                      >
                        {active ? (
                          <svg className="size-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <span className="size-3 shrink-0" />
                        )}
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Selected tags as pills */}
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary"
            >
              {tag}
              <button
                type="button"
                onClick={() =>
                  setSelectedTags((prev) => prev.filter((t) => t !== tag))
                }
                className="inline-flex size-3.5 items-center justify-center rounded-full hover:bg-primary/20"
                aria-label={`Remove ${tag} filter`}
              >
                <svg className="size-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 animate-pulse rounded bg-muted/60" />
                <div className="flex gap-1">
                  <div className="h-7 w-7 animate-pulse rounded bg-muted" />
                  <div className="h-7 w-7 animate-pulse rounded bg-muted" />
                  <div className="h-7 w-7 animate-pulse rounded bg-muted" />
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="h-3 w-full animate-pulse rounded bg-muted/30" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-muted/30" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted/30" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <StickyNote className="mb-3 size-10 text-muted-foreground/40" />
          <p className="text-lg font-medium text-muted-foreground">
            {showArchived ? "No archived notes" : showBookmarked ? "No bookmarked notes" : "No notes yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {showArchived
              ? "Archive notes to declutter your view"
              : showBookmarked
                ? "Bookmark notes to find them quickly"
                : "Write your first note to get started"}
          </p>
          {!showArchived && !showBookmarked && (
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
              className="group relative cursor-pointer rounded-xl border bg-card p-4 transition-colors hover:bg-accent/30"
              onClick={() => router.push(`/notes/${note.id}`)}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      notesStore.toggleArchive(note.id);
                    }}
                    aria-label={note.archived ? "Unarchive note" : "Archive note"}
                  >
                    {note.archived ? (
                      <ArchiveRestore className="size-3.5" />
                    ) : (
                      <Archive className="size-3.5" />
                    )}
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

          <div className="overflow-y-auto max-h-[55vh]">
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
          </div>

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

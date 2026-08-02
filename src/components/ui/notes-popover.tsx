"use client";

import { useSyncExternalStore, useState, useRef, useEffect } from "react";
import { notesStore, type Note } from "@/lib/notes-store";
import { viewModeStore } from "@/lib/view-mode-store";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { StickyNote, Plus, X, ExternalLink } from "lucide-react";
import Link from "next/link";
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
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const mdPreviewStyles =
  "min-h-[140px] max-h-[300px] overflow-y-auto rounded-md border p-3 text-sm leading-relaxed " +
  // headings
  "[&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-bold " +
  "[&_h2]:mb-1.5 [&_h2]:text-base [&_h2]:font-semibold " +
  "[&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold " +
  // paragraphs & lists
  "[&_p]:mb-2 [&_p:last-child]:mb-0 " +
  "[&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 " +
  "[&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 " +
  "[&_li]:mb-1 [&_li:last-child]:mb-0 " +
  // inline code
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs " +
  // code blocks
  "[&_pre]:mb-2 [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 " +
  // blockquote
  "[&_blockquote]:mb-2 [&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground " +
  // links
  "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 " +
  // table
  "[&_table]:mb-2 [&_table]:w-full [&_table]:border-collapse " +
  "[&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold " +
  "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_td]:text-xs " +
  // horizontal rule
  "[&_hr]:my-3 [&_hr]:border-border " +
  // task list
  "[&_input[type=checkbox]]:accent-primary";

// ─── Note Card ──────────────────────────────────────────────────────────

function NoteCard({
  note,
  onDelete,
  onEdit,
}: {
  note: Note;
  onDelete: (id: string) => void;
  onEdit: (note: Note) => void;
}) {
  const detailHref = `/notes/${note.id}`;
  return (
    <div
      onClick={() => onEdit(note)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit(note);
        }
      }}
      role="button"
      tabIndex={0}
      className="group relative flex w-full flex-col gap-0 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted cursor-pointer"
    >
      <div className="max-h-[3lh] overflow-hidden leading-snug text-foreground [&_ul]:mb-0 [&_ol]:mb-0 [&_ul]:pl-4 [&_ol]:pl-4 [&_li]:mb-0 [&_p]:mb-0 [&_p]:inline [&_p:after]:content-['_']">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSanitize]}
        >
          {note.text}
        </ReactMarkdown>
      </div>
      <span className="text-xs text-muted-foreground">
        {formatTime(note.createdAt)}
      </span>
      <div className="absolute right-1 top-1 flex gap-0 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="absolute -inset-1 rounded-md bg-background/20 backdrop-blur-[2px]" />
        <Link
          href={detailHref}
          onClick={(e) => e.stopPropagation()}
          className="relative flex size-4 items-center justify-center rounded hover:bg-muted-foreground/20"
          aria-label="Open note"
        >
          <ExternalLink className="size-2.5" />
        </Link>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(note.id);
          }}
          className="relative flex size-4 items-center justify-center rounded hover:bg-muted-foreground/20"
          aria-label="Delete note"
        >
          <X className="size-2.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────

export function NotesPopover() {
  const notes = useSyncExternalStore(
    notesStore.subscribe,
    notesStore.getSnapshot,
    notesStore.getServerSnapshot,
  );

  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);

  const activeNotes = notes.filter((note) => !note.archived);

  useEffect(() => {
    notesStore.load().finally(() => setLoading(false));
  }, []);

  const viewMode = useSyncExternalStore(
    viewModeStore.subscribe,
    viewModeStore.getSnapshot,
    viewModeStore.getServerSnapshot,
  );
  const sidebarWidth = viewMode === "simple" ? 64 : 224;
  const noteButtonTop = viewMode === "simple" ? 94 : 120;
  const [createOpen, setCreateOpen] = useState(false);
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [draft, setDraft] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const dialogOpen = createOpen || editNote !== null;

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
  }

  async function handleDelete(id: string) {
    await notesStore.remove(id);
  }

  function handleEdit(note: Note) {
    setEditNote(note);
    setDraft(note.text);
    setPreviewMode(false);
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
    <>
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          // Keep popover open while dialog is showing
          if (!nextOpen && dialogOpen) return;
          setOpen(nextOpen);
        }}
      >
        <div
          className={cn(
            "fixed right-[12px] z-50",
            "transition-all duration-300 ease-in-out",
            "top-2"
          )}
          style={{ right: `calc(17% + ${(224 - sidebarWidth) / 2}px)` }}
          // style={{ top: noteButtonTop }} // Looks better, but ux is bad (user has to move cursor very far), maybe same top but to the left, next to sidebar
        >
          <PopoverTrigger
            data-slot="notes-popover-trigger"
            className={cn(
              "flex size-7 items-center justify-center rounded-full",
              "bg-primary text-primary-foreground shadow-xs",
              "transition-all duration-300 ease-in-out hover:bg-primary/90 hover:shadow-sm",
              "data-open:bg-primary/90 data-open:shadow-sm",
              "cursor-pointer",
            )}
            aria-label="Quick notes"
          >
            <StickyNote className="size-3.5" />
          </PopoverTrigger>
        </div>
        <PopoverContent
          side="bottom"
          align="center"
          sideOffset={8}
          className="w-72 p-0"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-3 py-2.5">
            <span className="text-xs font-medium text-muted-foreground">
              Notes
            </span>
            <div className="flex items-center gap-0.5">
              <Link
                href="/notes"
                className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Full page"
              >
                <ExternalLink className="size-3.5" />
              </Link>
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={handleCreateOpen}
                aria-label="New note"
              >
                <Plus className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* Note list */}
          <div className="max-h-64 overflow-y-auto py-1">
            {loading ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                Loading...
              </p>
            ) : activeNotes.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                No notes yet.
              </p>
            ) : (
              <div className="relative">
                {activeNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editNote ? "Edit Note" : "New Note"}
            </DialogTitle>
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

          {/* Editor / Preview area */}
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
              className="min-h-[140px] resize-y"
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
    </>
  );
}

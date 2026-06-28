"use client";

import { useSyncExternalStore, useState, useRef, useEffect } from "react";
import { notesStore, type Note } from "@/lib/notes-store";
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
import { StickyNote, Plus, Trash2, X } from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function snippet(text: string, max = 100): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

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
      className="group relative flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted cursor-pointer"
    >
      <span className="line-clamp-2 leading-snug text-foreground">
        {snippet(note.text)}
      </span>
      <span className="text-xs text-muted-foreground">
        {formatTime(note.createdAt)}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(note.id);
        }}
        className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted-foreground/20"
        aria-label="Delete note"
      >
        <X className="size-3" />
      </button>
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

  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when dialog opens
  useEffect(() => {
    if ((createOpen || editNote) && textareaRef.current) {
      // Small delay for dialog animation
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [createOpen, editNote]);

  function handleSave() {
    const text = draft.trim();
    if (!text) return;

    if (editNote) {
      notesStore.update(editNote.id, text);
    } else {
      notesStore.add(text);
    }

    setDraft("");
    setCreateOpen(false);
    setEditNote(null);
  }

  function handleDelete(id: string) {
    notesStore.remove(id);
  }

  function handleEdit(note: Note) {
    setEditNote(note);
    setDraft(note.text);
  }

  function handleCreateOpen() {
    setDraft("");
    setEditNote(null);
    setCreateOpen(true);
  }

  function handleDialogClose() {
    setCreateOpen(false);
    setEditNote(null);
    setDraft("");
  }

  const dialogOpen = createOpen || editNote !== null;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          data-slot="notes-popover-trigger"
          className={cn(
            "fixed left-1/2 top-2 z-50 -translate-x-1/2",
            "flex size-7 items-center justify-center rounded-full",
            "bg-primary text-primary-foreground shadow-xs",
            "transition-all hover:bg-primary/90 hover:shadow-sm",
            "data-open:bg-primary/90 data-open:shadow-sm",
            "cursor-pointer",
          )}
          aria-label="Quick notes"
        >
          <StickyNote className="size-3.5" />
        </PopoverTrigger>
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
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={handleCreateOpen}
              aria-label="New note"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>

          {/* Note list */}
          <div className="max-h-64 overflow-y-auto py-1">
            {notes.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                No notes yet.
              </p>
            ) : (
              <div className="relative">
                {notes.map((note) => (
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editNote ? "Edit Note" : "New Note"}</DialogTitle>
            <DialogDescription>
              {editNote
                ? "Update your note."
                : "Write down a quick thought or reminder."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            ref={textareaRef}
            placeholder="Type your note..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-h-[100px] resize-y"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSave();
              }
            }}
          />
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

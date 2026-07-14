"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { bugNotesStore, type BugNote } from "@/lib/bug-notes-store";
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
import { Plus, Bug, Bookmark, AlertTriangle, Info } from "lucide-react";
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

const severityColors: Record<string, string> = {
  low: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  medium:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  high: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  critical:
    "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  "in-progress":
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  resolved:
    "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  closed: "bg-muted text-muted-foreground border-border",
};

const mdPreviewStyles =
  "overflow-hidden text-sm leading-relaxed " +
  "[&_h1]:mb-1 [&_h1]:text-base [&_h1]:font-bold " +
  "[&_h2]:mb-1 [&_h2]:text-sm [&_h2]:font-semibold " +
  "[&_h3]:mb-0.5 [&_h3]:text-xs [&_h3]:font-semibold " +
  "[&_p]:mb-1 [&_p:last-child]:mb-0 " +
  "[&_ul]:mb-1 [&_ul]:list-disc [&_ul]:pl-4 " +
  "[&_ol]:mb-1 [&_ol]:list-decimal [&_ol]:pl-4 " +
  "[&_li]:mb-0.5 [&_li:last-child]:mb-0 " +
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs " +
  "[&_pre]:mb-1 [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0";

// ─── Bug Card ────────────────────────────────────────────────────────────

function BugCard({
  note,
  onClick,
}: {
  note: BugNote;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      className="group relative flex cursor-pointer flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/30"
    >
      {/* Badges row */}
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase leading-none",
            severityColors[note.severity] ?? severityColors.medium,
          )}
        >
          <AlertTriangle className="size-2.5" />
          {note.severity}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const nextStatus = note.status === "resolved" ? "open" : "resolved";
            bugNotesStore.updateStatus(note.id, nextStatus);
          }}
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium capitalize leading-none",
            statusColors[note.status] ?? statusColors.open,
          )}
        >
          <Info className="size-2.5" />
          {note.status}
        </button>
      </div>

      {/* Content preview — first 5 lines with fade */}
      <div className="relative max-h-[6rem] overflow-hidden [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_60%,transparent_100%)] [mask-image:linear-gradient(to_bottom,black_0%,black_60%,transparent_100%)]">
        <div className={cn(mdPreviewStyles, note.status === "resolved" && "line-through opacity-60")}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize]}
          >
            {note.text}
          </ReactMarkdown>
        </div>
      </div>

      {/* Timestamp + bookmark */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {formatTime(note.createdAt)}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            bugNotesStore.toggleBookmark(note.id);
          }}
          className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={note.bookmarked ? "Remove bookmark" : "Bookmark"}
        >
          <Bookmark
            className={cn(
              "size-3",
              note.bookmarked && "fill-current text-yellow-500",
            )}
          />
        </button>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────

export default function BugsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<BugNote[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editNote, setEditNote] = useState<BugNote | null>(null);
  const [showBookmarked, setShowBookmarked] = useState(false);
  const [draft, setDraft] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filteredNotes = showBookmarked
    ? notes.filter((n) => n.bookmarked)
    : notes;

  const dialogOpen = createOpen || editNote !== null;

  function loadNotes() {
    setNotes([...bugNotesStore.getAll()]);
  }

  useEffect(() => {
    bugNotesStore.load().finally(() => {
      loadNotes();
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const unsub = bugNotesStore.subscribe(() => {
      loadNotes();
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (dialogOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [dialogOpen]);

  async function handleSave() {
    const text = draft.trim();
    if (!text) return;
    const store = bugNotesStore;
    if (editNote) {
      await store.update(editNote.id, text);
    } else {
      await store.add(text);
    }
    setDraft("");
    setCreateOpen(false);
    setEditNote(null);
    setPreviewMode(false);
  }

  function handleEdit(note: BugNote) {
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
    <PageScroll
      header={
        <div className="flex items-center justify-between rounded-xl border bg-background px-5 py-2 shadow-sm">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Bugs
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {showBookmarked
                ? `${filteredNotes.length} bookmarked`
                : `${notes.length} bug${notes.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showBookmarked ? "default" : "outline"}
              size="sm"
              onClick={() => setShowBookmarked((v) => !v)}
            >
              <Bookmark
                className={
                  showBookmarked ? "mr-1 size-3.5 fill-current" : "mr-1 size-3.5"
                }
              />
              Bookmarked
            </Button>
            <Button size="sm" onClick={handleCreateOpen}>
              <Plus className="mr-1 size-3.5" />
              New Bug
            </Button>
          </div>
        </div>
      }
      maxWidth="max-w-5xl"
      scrollContentClass="pt-6"
    >
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex gap-1.5">
                <div className="h-5 w-14 animate-pulse rounded bg-muted" />
                <div className="h-5 w-16 animate-pulse rounded bg-muted" />
              </div>
              <div className="mt-3 space-y-2">
                <div className="h-3 w-full animate-pulse rounded bg-muted/30" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-muted/30" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted/30" />
              </div>
              <div className="mt-3 h-3 w-20 animate-pulse rounded bg-muted/60" />
            </div>
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bug className="mb-3 size-10 text-muted-foreground/40" />
          <p className="text-lg font-medium text-muted-foreground">
            {showBookmarked ? "No bookmarked bugs" : "No bugs yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {showBookmarked
              ? "Bookmark bugs to find them quickly"
              : "Report your first bug to get started"}
          </p>
          {!showBookmarked && (
            <Button className="mt-4" onClick={handleCreateOpen}>
              <Plus className="mr-1 size-3.5" />
              Report Bug
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredNotes.map((note) => (
            <BugCard
              key={note.id}
              note={note}
              onClick={() => router.push(`/bugs/${note.id}`)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editNote ? "Edit Bug" : "New Bug"}</DialogTitle>
            <DialogDescription>
              {editNote
                ? "Update this bug report."
                : "Describe the bug you found."}
            </DialogDescription>
          </DialogHeader>

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
            <div className="min-h-[140px] rounded-md border p-3 text-sm leading-relaxed [&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:mb-1.5 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_li:last-child]:mb-0 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_pre]:mb-2 [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_blockquote]:mb-2 [&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_table]:mb-2 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_td]:text-xs">
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
              placeholder="Describe the bug... Steps to reproduce, expected vs actual behavior. (Markdown supported)"
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
              {editNote ? "Save" : "Report Bug"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageScroll>
  );
}

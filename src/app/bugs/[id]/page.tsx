"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { bugNotesStore, type BugNote } from "@/lib/bug-notes-store";
import { getBugNote } from "@/lib/actions/bug-notes";
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
import { cn } from "@/lib/utils";
import { ArrowLeft, Pencil, Trash2, AlertTriangle, Info, Bug } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

// ─── Markdown styles ────────────────────────────────────────────────────

const mdStyles =
  "w-full max-w-none text-sm leading-relaxed " +
  "[&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-bold " +
  "[&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-semibold " +
  "[&_h3]:mb-1.5 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold " +
  "[&_p]:mb-3 [&_p:last-child]:mb-0 " +
  "[&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 " +
  "[&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 " +
  "[&_li]:mb-1.5 [&_li:last-child]:mb-0 " +
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm " +
  "[&_pre]:mb-4 [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0 " +
  "[&_blockquote]:mb-3 [&_blockquote]:border-l-4 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground " +
  "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 " +
  "[&_a:hover]:opacity-80 " +
  "[&_table]:mb-4 [&_table]:w-full [&_table]:border-collapse " +
  "[&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-sm [&_th]:font-semibold " +
  "[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm " +
  "[&_hr]:my-6 [&_hr]:border-border " +
  "[&_img]:max-w-full [&_img]:rounded-lg " +
  "[&_input[type=checkbox]]:accent-primary";

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

// ─── Helpers ────────────────────────────────────────────────────────────

function formatFullTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ─── Page ────────────────────────────────────────────────────────────────

export default function BugDetailPage() {
  const params = useParams();
  const router = useRouter();
  const noteId = params.id as string;

  const [note, setNote] = useState<BugNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Severity/status picker (edit mode)
  const [editSeverity, setEditSeverity] = useState<BugNote["severity"]>("medium");
  const [editStatus, setEditStatus] = useState<BugNote["status"]>("open");

  // Delete state
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fromStore = bugNotesStore.getAll().find((n) => n.id === noteId);
    if (fromStore) {
      setNote(fromStore);
      setLoading(false);
    }

    getBugNote(noteId).then((n) => {
      if (n) {
        setNote(n);
        setLoading(false);
      } else if (!fromStore) {
        setNotFound(true);
        setLoading(false);
      }
    });
  }, [noteId]);

  useEffect(() => {
    const unsub = bugNotesStore.subscribe(() => {
      const updated = bugNotesStore.getAll().find((n) => n.id === noteId);
      if (updated) setNote(updated);
    });
    return unsub;
  }, [noteId]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [editing]);

  async function handleSave() {
    const text = draft.trim();
    if (!text || !note) return;
    await bugNotesStore.update(note.id, text);
    setEditing(false);
    setPreviewMode(false);
  }

  async function handleDelete() {
    if (!note) return;
    await bugNotesStore.remove(note.id);
    router.push("/bugs");
  }

  function startEditing() {
    if (!note) return;
    setDraft(note.text);
    setEditSeverity(note.severity ?? "medium");
    setEditStatus(note.status ?? "open");
    setPreviewMode(false);
    setEditing(true);
  }

  // Keyboard shortcut: Ctrl+E toggles editing
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === "e") {
        e.preventDefault();
        if (editing) {
          const text = draft.trim();
          if (text && note) {
            (async () => {
              await bugNotesStore.update(note.id, text);
              setEditing(false);
              setPreviewMode(false);
            })();
          }
        } else if (note) {
          setDraft(note.text);
          setPreviewMode(false);
          setEditing(true);
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editing, note, draft]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-10">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-5 w-16 animate-pulse rounded bg-muted" />
          <div className="h-5 w-20 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (notFound || !note) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <Bug className="mx-auto mb-3 size-10 text-muted-foreground/40" />
        <h1 className="text-2xl font-semibold text-muted-foreground">
          Bug not found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This bug report may have been deleted.
        </p>
        <Button className="mt-6" onClick={() => router.push("/bugs")}>
          <ArrowLeft className="mr-1 size-4" />
          Back to Bugs
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      {/* Back + actions */}
      <div className="mb-6 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/bugs")}
        >
          <ArrowLeft className="mr-1 size-4" />
          All Bugs
        </Button>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={startEditing}>
            <Pencil className="mr-1 size-3.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleting(true)}
          >
            <Trash2 className="mr-1 size-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Severity + Status badges */}
      {!editing && (
        <div className="mb-4 flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium uppercase",
              severityColors[note.severity] ?? severityColors.medium,
            )}
          >
            <AlertTriangle className="size-3" />
            {note.severity}
          </span>
          <button
            type="button"
            onClick={() => {
              const nextStatus = note.status === "resolved" ? "open" : "resolved";
              bugNotesStore.updateStatus(note.id, nextStatus);
            }}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium capitalize transition-colors hover:opacity-80",
              statusColors[note.status] ?? statusColors.open,
            )}
          >
            <Info className="size-3" />
            {note.status}
          </button>
        </div>
      )}

      {/* Note content */}
      {editing ? (
        <div className="space-y-4">
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
            <div
              className={
                mdStyles +
                " min-h-[200px] rounded-md border p-4"
              }
            >
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
              placeholder="Describe the bug..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-h-[300px] resize-y"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSave();
                }
              }}
            />
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditing(false);
                setPreviewMode(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!draft.trim()}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <p className="text-xs text-muted-foreground">
              Created {formatFullTime(note.createdAt)}
              {note.updatedAt !== note.createdAt &&
                ` · Updated ${formatFullTime(note.updatedAt)}`}
            </p>
          </div>

          <article className={cn(mdStyles, note.status === "resolved" && "line-through opacity-60")}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
            >
              {note.text}
            </ReactMarkdown>
          </article>
        </>
      )}

      {/* Delete confirmation */}
      <Dialog
        open={deleting}
        onOpenChange={(o) => !o && setDeleting(false)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Bug</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete this bug report? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

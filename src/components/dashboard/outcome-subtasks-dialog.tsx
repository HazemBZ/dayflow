"use client";

import { useState, useEffect, useCallback, useRef, startTransition } from "react";
import { Plus, Trash2, ListChecks, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getOutcomeSubtasks,
  createOutcomeSubtask,
  updateOutcomeSubtask,
  deleteOutcomeSubtask,
} from "@/lib/actions/daily";

interface Subtask {
  id: number;
  date: string;
  outcomeIndex: number;
  text: string;
  completed: boolean | number;
  sortOrder: number | null;
}

interface OutcomeSubtasksDialogProps {
  date: string;
  outcomeIndex: number; // 0, 1, or 2 -> maps to 1, 2, 3
  outcomeLabel: string;
  outcomeText: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubtaskChange?: () => void;
}

export function OutcomeSubtasksDialog({
  date,
  outcomeIndex,
  outcomeLabel,
  outcomeText,
  open,
  onOpenChange,
  onSubtaskChange,
}: OutcomeSubtasksDialogProps) {
  const dbIndex = outcomeIndex + 1;
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId !== null && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getOutcomeSubtasks(date, dbIndex);
      startTransition(() => setSubtasks(rows as Subtask[]));
    } finally {
      setLoading(false);
    }
  }, [date, dbIndex]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleAdd = useCallback(async () => {
    const text = newText.trim();
    if (!text) return;
    setAdding(true);
    try {
      await createOutcomeSubtask({ date, outcomeIndex: dbIndex, text });
      setNewText("");
      await load();
      onSubtaskChange?.();
    } finally {
      setAdding(false);
    }
  }, [newText, date, dbIndex, load, onSubtaskChange]);

  const handleToggle = useCallback(
    async (id: number, completed: boolean) => {
      await updateOutcomeSubtask(id, { completed });
      setSubtasks((prev) =>
        prev.map((s) => (s.id === id ? { ...s, completed } : s)),
      );
      onSubtaskChange?.();
    },
    [onSubtaskChange],
  );

  const handleDelete = useCallback(
    async (id: number) => {
      await deleteOutcomeSubtask(id);
      setSubtasks((prev) => prev.filter((s) => s.id !== id));
      onSubtaskChange?.();
    },
    [onSubtaskChange],
  );

  const handleStartEdit = useCallback((sub: Subtask) => {
    setEditingId(sub.id);
    setEditText(sub.text);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    const id = editingId;
    if (!id) return;
    const text = editText.trim();
    if (!text) return;
    await updateOutcomeSubtask(id, { text });
    setSubtasks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, text } : s)),
    );
    setEditingId(null);
    setEditText("");
  }, [editingId, editText]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditText("");
  }, []);

  const completedCount = subtasks.filter(
    (s) => s.completed === true,
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-amber-500" />
            Subtasks: {outcomeLabel}
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground -mt-2 truncate">
          {outcomeText}
        </p>

        {/* Subtask list */}
        <div className="relative max-h-[240px] space-y-1 overflow-y-auto">
          {/* Initial loading skeleton */}
          {loading && subtasks.length === 0 && (
            <div className="space-y-2 py-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-md px-1 py-1.5"
                >
                  <div className="h-4 w-4 shrink-0 animate-pulse rounded-sm bg-muted-foreground/20" />
                  <div className="h-3.5 flex-1 animate-pulse rounded bg-muted-foreground/20" />
                  <div className="h-3.5 w-3.5 shrink-0 animate-pulse rounded bg-muted-foreground/20" />
                </div>
              ))}
            </div>
          )}

          {/* Refresh overlay */}
          {loading && subtasks.length > 0 && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-sm bg-background/60">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && subtasks.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No subtasks yet. Add one below.
            </p>
          )}
          {subtasks.map((sub) => (
            <div
              key={sub.id}
              className="group flex items-center gap-2 rounded-md px-1 py-1.5 hover:bg-muted/50"
            >
              <Checkbox
                checked={sub.completed === true}
                onCheckedChange={(checked) =>
                  handleToggle(sub.id, checked === true)
                }
                aria-label={`Mark "${sub.text}" ${sub.completed ? "incomplete" : "complete"}`}
              />
              {editingId === sub.id ? (
                <Input
                  ref={editInputRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={handleSaveEdit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSaveEdit();
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      handleCancelEdit();
                    }
                  }}
                  className="h-7 text-sm flex-1"
                />
              ) : (
                <button
                  onClick={() => handleStartEdit(sub)}
                  className={`flex-1 cursor-text text-left text-sm leading-snug ${
                    sub.completed === true
                      ? "text-muted-foreground line-through"
                      : ""
                  }`}
                >
                  {sub.text}
                </button>
              )}
              <button
                onClick={() => handleDelete(sub.id)}
                className="opacity-0 transition-opacity hover:text-destructive focus:opacity-100 group-hover:opacity-100"
                aria-label={`Delete subtask "${sub.text}"`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add new subtask */}
        <div className="flex items-center gap-2 border-t pt-3">
          <Input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Add a subtask..."
            className="h-8 text-sm"
            disabled={adding}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <Button
            size="sm"
            variant="default"
            onClick={handleAdd}
            disabled={adding || !newText.trim()}
            className="shrink-0 gap-1"
          >
            {adding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Add
          </Button>
        </div>

        {subtasks.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {completedCount} of {subtasks.length} completed
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

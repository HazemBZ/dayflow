"use client";

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  dailyItemsStore,
  type DailyItem,
} from "@/lib/daily-items-store";
import type { DailyItemKind } from "@/lib/db/schema";

interface ChoresExtrasListProps {
  date: string;
  kind: DailyItemKind;
}

export function ChoresExtrasList({ date, kind }: ChoresExtrasListProps) {
  const items = useSyncExternalStore(
    dailyItemsStore.subscribe,
    () => dailyItemsStore.getItems(date, kind),
    () => dailyItemsStore.getItems(date, kind),
  );
  const loaded = useSyncExternalStore(
    dailyItemsStore.subscribe,
    () => dailyItemsStore.isLoaded(date, kind),
    () => false,
  );
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId !== null && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  useEffect(() => {
    void dailyItemsStore.load(date, kind);
  }, [date, kind]);

  const handleAdd = useCallback(async () => {
    const text = newText.trim();
    if (!text) return;
    setAdding(true);
    try {
      await dailyItemsStore.add(date, kind, text);
      setNewText("");
    } finally {
      setAdding(false);
    }
  }, [newText, date, kind]);

  const handleToggle = useCallback((id: number, completed: boolean) => {
    void dailyItemsStore.toggle(id, completed);
  }, []);

  const handleDelete = useCallback((id: number) => {
    void dailyItemsStore.remove(id);
  }, []);

  const handleStartEdit = useCallback((item: DailyItem) => {
    setEditingId(item.id);
    setEditText(item.text);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    const id = editingId;
    if (!id) return;
    const text = editText.trim();
    if (!text) return;
    await dailyItemsStore.setText(id, text);
    setEditingId(null);
    setEditText("");
  }, [editingId, editText]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditText("");
  }, []);

  const completedCount = items.filter((item) => item.completed === true).length;

  return (
    <section>
      {!loaded ? (
        <div className="space-y-2 py-1">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md px-1 py-1.5"
            >
              <div className="h-4 w-4 shrink-0 animate-pulse rounded-sm bg-muted-foreground/20" />
              <div className="h-3.5 flex-1 animate-pulse rounded bg-muted-foreground/20" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {items.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">
              Nothing here yet. Add an item below.
            </p>
          ) : (
            <ul className="space-y-1">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="group flex items-center gap-2 rounded-md px-1 py-1.5 hover:bg-muted/50"
                >
                  <Checkbox
                    checked={item.completed === true}
                    onCheckedChange={(checked) =>
                      handleToggle(item.id, checked === true)
                    }
                    aria-label={`Mark "${item.text}" ${item.completed ? "incomplete" : "complete"}`}
                  />
                  {editingId === item.id ? (
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
                      className="h-7 flex-1 text-sm"
                    />
                  ) : (
                    <button
                      onClick={() => handleStartEdit(item)}
                      className={`flex-1 cursor-text text-left text-sm leading-snug ${
                        item.completed === true
                          ? "text-muted-foreground line-through"
                          : ""
                      }`}
                    >
                      {item.text}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="opacity-0 transition-opacity hover:text-destructive focus:opacity-100 group-hover:opacity-100"
                    aria-label={`Delete item "${item.text}"`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-2 flex items-center gap-2">
            <Input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder={`Add a ${kind}...`}
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

          {items.length > 0 && (
            <p className="mt-1.5 text-center text-xs text-muted-foreground">
              {completedCount} of {items.length} completed
            </p>
          )}
        </>
      )}
    </section>
  );
}

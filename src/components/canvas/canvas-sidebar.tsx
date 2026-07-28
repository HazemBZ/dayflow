"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { canvasStore, type CanvasRow } from "@/lib/canvas-store";
import { PanelRightClose, PanelRightOpen, Pencil, Plus, Trash2 } from "lucide-react";

const SIDEBAR_WIDTH = 220;

interface CanvasSidebarProps {
  canvases: readonly CanvasRow[];
  activeCanvasId: string | null;
  onSelectCanvas: (id: string) => void;
  open: boolean;
  onToggle: (v: boolean) => void;
}

export function CanvasSidebar({
  canvases,
  activeCanvasId,
  onSelectCanvas,
  open,
  onToggle,
}: CanvasSidebarProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  // Rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const renameSubmittingRef = useRef(false);
  const renameCancelledRef = useRef(false);

  async function handleCreate() {
    setCreating(true);
    setNewName("");
    setCreateError(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function handleSubmit() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    const name = newName.trim() || `Canvas ${canvases.length + 1}`;
    try {
      const c = await canvasStore.createCanvas(name);
      await canvasStore.setActiveCanvas(c.id);
      router.push(`/canvas?c=${c.id}`, { scroll: false });
      setCreating(false);
      setNewName("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create canvas.";
      console.error("Canvas creation error:", error);
      setCreateError(message);
    } finally {
      submittingRef.current = false;
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (canvases.length <= 1) return; // keep at least one
    await canvasStore.deleteCanvas(id);
    // store handles switching active canvas if needed
  }

  // ── Rename ──────────────────────────────────────────────────────────

  function startEditing(c: CanvasRow) {
    setEditingId(c.id);
    setEditName(c.name);
    setRenameError(null);
    setTimeout(() => editInputRef.current?.focus(), 50);
  }

  function cancelEditing() {
    renameCancelledRef.current = true;
    setEditingId(null);
    setEditName("");
    setRenameError(null);
  }

  async function handleRename() {
    if (editingId === null || renameSubmittingRef.current) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      cancelEditing();
      return;
    }
    renameSubmittingRef.current = true;
    try {
      await canvasStore.renameCanvas(editingId, trimmed);
      cancelEditing();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to rename canvas.";
      console.error("Canvas rename error:", error);
      setRenameError(message);
    } finally {
      renameSubmittingRef.current = false;
    }
  }

  function handleRenameBlur() {
    if (renameCancelledRef.current) {
      renameCancelledRef.current = false;
      return;
    }
    if (renameSubmittingRef.current) return;
    handleRename();
  }

  return (
    <motion.div
      initial={false}
      animate={{ width: open ? SIDEBAR_WIDTH : 0 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="relative h-full shrink-0"
    >
      {/* Sidebar panel — clipped by overflow-hidden when collapsed */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          style={{ width: SIDEBAR_WIDTH }}
          className="flex h-full flex-col border-l bg-background"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5">
            <span className="text-xs font-medium text-muted-foreground">
              Canvases
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCreate}
                className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="New canvas"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Canvas list */}
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {creating && (
              <div className="mb-1 px-2 py-1.5">
                <input
                  ref={inputRef}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit();
                    if (e.key === "Escape") setCreating(false);
                  }}
                  onBlur={() => {
                    if (newName.trim()) handleSubmit();
                    else setCreating(false);
                  }}
                  placeholder="Canvas name..."
                  className={cn(
                    "w-full rounded-md border bg-background px-2 py-1",
                    "text-xs outline-none placeholder:text-muted-foreground/50",
                    "focus:border-ring focus:ring-1 focus:ring-ring/30"
                  )}
                  autoFocus
                />
                {createError && (
                  <p className="mt-1 text-[10px] text-destructive">{createError}</p>
                )}
		</div>
            )}

            <div className="space-y-0.5">
              {canvases.map((c) => {
                const isActive = c.id === activeCanvasId;
                const isEditing = editingId === c.id;

                if (isEditing) {
                  return (
                    <div key={c.id} className="px-2 py-1.5">
                      <input
                        ref={editInputRef}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename();
                          if (e.key === "Escape") cancelEditing();
                        }}
                        onBlur={handleRenameBlur}
                        className={cn(
                          "w-full rounded-md border bg-background px-1 py-0",
                          "text-xs outline-none",
                          "focus:border-ring focus:ring-1 focus:ring-ring/30"
                        )}
                        aria-label="Rename canvas"
                        autoFocus
                      />
                      {renameError && (
                        <p className="mt-1 text-[10px] text-destructive">{renameError}</p>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={c.id}
                    className={cn(
                      "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectCanvas(c.id)}
                      className={cn(
                        "flex-1 truncate text-left outline-none cursor-pointer rounded",
                        "focus-visible:ring-1 focus-visible:ring-ring",
                        isActive
                          ? "text-primary-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {c.name}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(c);
                      }}
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded",
                        "opacity-0 focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100",
                        "transition-opacity focus-visible:ring-1 focus-visible:ring-ring",
                        isActive
                          ? "text-primary-foreground/70 hover:text-primary-foreground"
                          : "text-muted-foreground/50 hover:text-foreground"
                      )}
                      title="Rename canvas"
                    >
                      <Pencil className="size-3" />
                    </button>
                    {canvases.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, c.id)}
                          className={cn(
                            "flex size-4 shrink-0 items-center justify-center rounded",
                            "opacity-0 focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100",
                            "transition-opacity focus-visible:ring-1 focus-visible:ring-ring",
                            isActive
                              ? "text-primary-foreground/70 hover:text-primary-foreground"
                              : "text-muted-foreground/50 hover:text-foreground"
                          )}
                          title="Delete canvas"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Toggle button — anchored at left edge, follows width animation */}
      <button
        type="button"
        onClick={() => onToggle(!open)}
        className={cn(
          "absolute left-0 top-1/2 z-20 -translate-y-1/2 -translate-x-full",
          "flex h-14 w-6 items-center justify-center",
          "bg-background text-muted-foreground hover:text-foreground transition-colors",
          open
            ? "rounded-l-md border-y border-l shadow-sm"
            : "rounded-md border shadow-sm"
        )}
        title={open ? "Hide canvases" : "Show canvases"}
      >
        {open ? (
          <PanelRightClose className="size-3.5" />
        ) : (
          <PanelRightOpen className="size-3.5" />
        )}
      </button>
    </motion.div>
  );
}

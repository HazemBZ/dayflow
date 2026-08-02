"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { canvasStore, type CanvasRow } from "@/lib/canvas-store";
import { CanvasSidebarItem } from "@/components/canvas/canvas-sidebar-item";
import { PanelRightClose, PanelRightOpen, Plus } from "lucide-react";

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
  const [orderedCanvases, setOrderedCanvases] = useState<readonly CanvasRow[]>(canvases);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    setOrderedCanvases(canvases);
  }, [canvases]);

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

  async function handleDelete(id: string) {
    if (canvases.length <= 1) return; // keep at least one
    await canvasStore.deleteCanvas(id);
    // store handles switching active canvas if needed
  }

  async function handleDragEnd(event: DragEndEvent): Promise<void> {
    const activeId = `${event.active.id}`;
    const overId = event.over ? `${event.over.id}` : null;
    if (!overId || activeId === overId) return;

    const previousCanvases = orderedCanvases;
    const oldIndex = previousCanvases.findIndex((canvas) => canvas.id === activeId);
    const newIndex = previousCanvases.findIndex((canvas) => canvas.id === overId);
    if (oldIndex < 0 || newIndex < 0) return;

    const reorderedCanvases = arrayMove([...previousCanvases], oldIndex, newIndex);
    setReorderError(null);
    setOrderedCanvases(reorderedCanvases);

    try {
      await canvasStore.reorderCanvases(reorderedCanvases.map((canvas) => canvas.id));
    } catch (error) {
      setOrderedCanvases(previousCanvases);
      setReorderError(error instanceof Error ? error.message : "Unable to reorder canvases.");
    }
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

            {reorderError && (
              <p role="alert" className="mb-1 px-2 text-[10px] text-destructive">
                {reorderError}
              </p>
            )}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={() => setReorderError(null)}
              onDragEnd={(event) => void handleDragEnd(event)}
            >
              <SortableContext
                items={orderedCanvases.map((canvas) => canvas.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-0.5">
                  {orderedCanvases.map((c) => {
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
                      <CanvasSidebarItem
                        key={c.id}
                        canvas={c}
                        isActive={isActive}
                        canDelete={orderedCanvases.length > 1}
                        onSelect={onSelectCanvas}
                        onRename={startEditing}
                        onDelete={(id) => void handleDelete(id)}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
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

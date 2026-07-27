"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { canvasStore, type CanvasRow } from "@/lib/canvas-store";
import { PanelRightClose, PanelRightOpen, Plus, Trash2 } from "lucide-react";

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
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleCreate() {
    setCreating(true);
    setNewName("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function handleSubmit() {
    const name = newName.trim() || `Canvas ${canvases.length + 1}`;
    const c = await canvasStore.createCanvas(name);
    setCreating(false);
    setNewName("");
    onSelectCanvas(c.id);
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (canvases.length <= 1) return; // keep at least one
    await canvasStore.deleteCanvas(id);
    // store handles switching active canvas if needed
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
	</div>
            )}

            <div className="space-y-0.5">
              {canvases.map((c) => {
                const isActive = c.id === activeCanvasId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onSelectCanvas(c.id)}
                    className={cn(
                      "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span className="flex-1 truncate">{c.name}</span>
                    {canvases.length > 1 && (
                      <span
                        onClick={(e) => handleDelete(e, c.id)}
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded opacity-0 transition-opacity",
                          isActive
                            ? "text-primary-foreground/70 hover:text-primary-foreground"
                            : "text-muted-foreground/50 hover:text-foreground",
                          "group-hover:opacity-100"
                        )}
                        title="Delete canvas"
                      >
                        <Trash2 className="size-3" />
                      </span>
                    )}
                  </button>
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

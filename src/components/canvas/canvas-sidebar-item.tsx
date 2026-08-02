"use client";

import { useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CanvasRow } from "@/lib/canvas-store";

type CanvasSidebarItemProps = {
  readonly canvas: CanvasRow;
  readonly isActive: boolean;
  readonly canDelete: boolean;
  readonly onSelect: (id: string) => void;
  readonly onRename: (canvas: CanvasRow) => void;
  readonly onDelete: (id: string) => void;
};

export function CanvasSidebarItem({
  canvas,
  isActive,
  canDelete,
  onSelect,
  onRename,
  onDelete,
}: CanvasSidebarItemProps) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: canvas.id });
  const style = useMemo(
    () => ({ transform: CSS.Transform.toString(transform), transition }),
    [transform, transition],
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex w-full items-center gap-1 rounded-md px-1 py-1.5 text-xs transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        isDragging && "z-10 opacity-50",
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        className={cn(
          "flex size-4 shrink-0 touch-none items-center justify-center rounded cursor-grab active:cursor-grabbing",
          "focus-visible:ring-1 focus-visible:ring-ring",
          isActive
            ? "text-primary-foreground/70 hover:text-primary-foreground"
            : "text-muted-foreground/50 hover:text-foreground",
        )}
        aria-label={`Drag to reorder ${canvas.name}`}
      >
        <GripVertical className="size-3" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onSelect(canvas.id)}
        className={cn(
          "flex-1 truncate rounded text-left outline-none cursor-pointer",
          "focus-visible:ring-1 focus-visible:ring-ring",
          isActive ? "text-primary-foreground" : "text-muted-foreground",
        )}
      >
        {canvas.name}
      </button>
      <button
        type="button"
        onClick={() => onRename(canvas)}
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded",
          "opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-ring",
          isActive
            ? "text-primary-foreground/70 hover:text-primary-foreground"
            : "text-muted-foreground/50 hover:text-foreground",
        )}
        title="Rename canvas"
      >
        <Pencil className="size-3" />
      </button>
      {canDelete && (
        <button
          type="button"
          onClick={() => onDelete(canvas.id)}
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded",
            "opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-ring",
            isActive
              ? "text-primary-foreground/70 hover:text-primary-foreground"
              : "text-muted-foreground/50 hover:text-foreground",
          )}
          title="Delete canvas"
        >
          <Trash2 className="size-3" />
        </button>
      )}
    </div>
  );
}

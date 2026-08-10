"use client";

import { memo, useState, useCallback, useRef, useEffect } from "react";
import {
  Handle,
  NodeResizer,
  Position,
  type NodeProps,
  type Node,
  type OnResizeEnd,
} from "@xyflow/react";
import { cn } from "@/lib/utils";
import { canvasStore } from "@/lib/canvas-store";
import { MarkdownContent } from "./markdown-content";

export type CanvasNoteNodeData = {
  content: string;
  nodeId: string;
};

export type CanvasNoteNodeType = Node<CanvasNoteNodeData, "canvasNote">;

function CanvasNoteNodeComponent({
  data,
  selected,
}: NodeProps<CanvasNoteNodeType>) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDirtyRef = useRef(false);

  // Sync when data changes externally (undo, reload) but not during local edits
  useEffect(() => {
    if (!isDirtyRef.current) {
      setEditValue(data.content);
    }
  }, [data.content]);

  // Focus + select textarea content when editing starts
  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editing]);

  const startEditing = useCallback(() => {
    setEditValue(data.content);
    setEditing(true);
  }, [data.content]);

  const save = useCallback(() => {
    const trimmed = editValue.trim();
    setEditing(false);
    isDirtyRef.current = false;
    if (trimmed !== data.content) {
      canvasStore.updateNoteNodeContent(data.nodeId, trimmed);
    }
  }, [editValue, data.content, data.nodeId]);

  const cancel = useCallback(() => {
    setEditValue(data.content);
    setEditing(false);
    isDirtyRef.current = false;
  }, [data.content]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Prevent React Flow from intercepting
      e.stopPropagation();
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        save();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
    },
    [save, cancel],
  );

  const handleBlur = useCallback(() => {
    save();
  }, [save]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      isDirtyRef.current = true;
      setEditValue(e.target.value);
    },
    [],
  );

  // Stop propagation so the textarea doesn't trigger node drag/select
  const handleEditorMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleResizeEnd: OnResizeEnd = useCallback(
    (_, params) => {
      canvasStore.upsertNoteNode(
        data.nodeId,
        data.content,
        params.x,
        params.y,
        params.width,
        params.height,
      );
    },
    [data.nodeId, data.content],
  );

  return (
    <div
      className={cn(
        "h-full w-full rounded-lg border bg-amber-50/90 shadow-sm transition-shadow dark:bg-amber-950/60",
        "border-amber-300/60",
        selected && "shadow-md ring-2 ring-primary",
      )}
      onDoubleClick={startEditing}
    >
      <NodeResizer
        minWidth={200}
        minHeight={120}
        isVisible={selected}
        onResizeEnd={handleResizeEnd}
        handleClassName="!size-2.5 !border-2 !border-background !bg-primary !shadow-sm !rounded-full"
        lineClassName="!border border-primary/60"
      />
      <Handle
        type="target"
        position={Position.Top}
        className="!size-2 !border-2 !border-primary !bg-background"
      />
      <div className="h-full w-full overflow-y-auto px-3 py-2.5">
        {editing ? (
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onMouseDown={handleEditorMouseDown}
            className="w-full bg-transparent text-sm leading-snug outline-none resize-none"
            rows={Math.max(1, editValue.split("\n").length)}
            aria-label="Edit note content"
          />
        ) : data.content ? (
          <MarkdownContent content={data.content} />
        ) : (
          <div className="text-sm leading-snug text-muted-foreground/50 italic">
            Untitled
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!size-2 !border-2 !border-primary !bg-background"
      />
    </div>
  );
}

export const CanvasNoteNode = memo(CanvasNoteNodeComponent);
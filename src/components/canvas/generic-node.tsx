"use client";

import { memo, useState, useCallback, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { canvasStore } from "@/lib/canvas-store";

export type GenericNodeData = {
  content: string;
  nodeId: string;
};

export type GenericNodeType = Node<GenericNodeData, "generic">;

function GenericNodeComponent({ data, selected }: NodeProps<GenericNodeType>) {
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
      canvasStore.updateGenericNodeContent(data.nodeId, trimmed);
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

  const displayContent = data.content || "Untitled";

  return (
    <div
      className={cn(
        "min-w-[160px] max-w-[220px] rounded-xl border bg-card px-3 py-2.5 shadow-sm transition-shadow",
        selected && "shadow-md ring-2 ring-primary",
      )}
      onDoubleClick={startEditing}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!size-2 !border-2 !border-primary !bg-background"
      />
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
          aria-label="Edit node content"
        />
      ) : (
        <div
          className={cn(
            "text-sm leading-snug",
            !data.content && "text-muted-foreground/50 italic",
          )}
        >
          {displayContent}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!size-2 !border-2 !border-primary !bg-background"
      />
    </div>
  );
}

export const GenericNode = memo(GenericNodeComponent);

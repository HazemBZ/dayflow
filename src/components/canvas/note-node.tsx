"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "./markdown-content";

export type NoteNodeData = {
  label: string;
  tags: string[];
  noteId: string;
};

export type NoteNodeType = Node<NoteNodeData, "note">;

function NoteNodeComponent({ data, selected }: NodeProps<NoteNodeType>) {
  return (
    <div
      className={cn(
        "min-w-[160px] max-w-[220px] rounded-xl border bg-card px-3 py-2.5 shadow-sm transition-shadow",
        selected && "shadow-md ring-2 ring-primary",
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!size-2 !border-2 !border-primary !bg-background"
      />
      <div className="max-h-[4.5rem] overflow-hidden [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_60%,transparent_100%)] [mask-image:linear-gradient(to_bottom,black_0%,black_60%,transparent_100%)]">
        <MarkdownContent content={data.label} />
      </div>
      {data.tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {data.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
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

export const NoteNode = memo(NoteNodeComponent);

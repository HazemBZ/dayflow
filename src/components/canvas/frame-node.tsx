"use client";

import { memo, useCallback } from "react";
import {
  Handle,
  Position,
  NodeResizer,
  type NodeProps,
  type Node,
  type ResizeParams,
} from "@xyflow/react";
import { cn } from "@/lib/utils";
import { canvasStore } from "@/lib/canvas-store";

export type FrameNodeData = {
  label: string;
  color: string | null;
};

export type FrameNodeType = Node<FrameNodeData, "frame">;

function FrameNodeComponent({ data, selected, id }: NodeProps<FrameNodeType>) {
  const color = data.color ?? "hsl(220, 70%, 60%)";

  const onResizeEnd = useCallback(
    (_event: unknown, params: ResizeParams) => {
      const cf = canvasStore.getFrames().find((f) => f.id === id);
      if (!cf) return;
      canvasStore.upsertFrame(
        id,
        cf.name,
        cf.x,
        cf.y,
        params.width,
        params.height,
        cf.color,
      );
    },
    [id],
  );

  return (
    <div
      className={cn(
        "min-w-[200px] min-h-[120px] h-full w-full rounded-xl border-2 bg-background/60 backdrop-blur-[1px]",
        selected ? "border-primary/50" : undefined,
      )}
      style={{
        borderColor: selected ? undefined : `${color}40`,
        background: `linear-gradient(135deg, ${color}08, ${color}15)`,
      }}
    >
      <NodeResizer
        minWidth={200}
        minHeight={120}
        isVisible={selected}
        onResizeEnd={onResizeEnd}
        handleClassName="!size-5 !border-[3px] !border-background !bg-primary !shadow-sm !rounded-full"
        lineClassName="!border-4 border-primary/60 hover:border-primary transition-colors"
      />

      {/* Header */}
      <div
        className="flex items-center gap-2 rounded-t-xl px-3 py-1.5 text-xs font-semibold tracking-wide"
        style={{
          background: `linear-gradient(135deg, ${color}18, ${color}25)`,
          color: color,
        }}
      >
        <div
          className="size-2 rounded-sm shrink-0"
          style={{ backgroundColor: color }}
        />
        {data.label}
      </div>

      {/* Invisible handles so edges can connect to frames */}
      <Handle
        type="target"
        position={Position.Top}
        className="!size-2 !border-2 !border-primary !bg-background opacity-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!size-2 !border-2 !border-primary !bg-background opacity-0"
      />
    </div>
  );
}

export const FrameNode = memo(FrameNodeComponent);

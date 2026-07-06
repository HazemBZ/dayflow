"use client";

import { useState, useEffect, useCallback, useMemo, startTransition } from "react";
import { Crown, Save } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionTooltip } from "@/components/ui/section-tooltip";
import { cn } from "@/lib/utils";

interface TopOutcomesProps {
  outcomes: [string | null, string | null, string | null];
  completed: [boolean, boolean, boolean];
  onSave: (index: number, text: string) => Promise<void>;
  onToggle: (index: number, completed: boolean) => Promise<void>;
  onReorder: (items: { text: string; completed: boolean }[]) => Promise<void>;
  viewMode?: "simple" | "full";
}

function SortableCard({
  id,
  index,
  value,
  done,
  dirty,
  saving,
  label,
  onValueChange,
  onSave,
  onToggle,
}: {
  id: string;
  index: number;
  value: string;
  done: boolean;
  dirty: boolean;
  saving: boolean;
  label: string;
  onValueChange: (index: number, value: string) => void;
  onSave: (index: number) => void;
  onToggle: (index: number, completed: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
    }),
    [transform, transition],
  );

  return (
    <Card
      ref={setNodeRef}
      style={style}
      size="sm"
      className={cn(
        isDragging && "z-10 opacity-50 ring-2 ring-amber-500",
      )}
    >
      <CardContent className="flex items-center gap-3 py-3">
        <button
          ref={setActivatorNodeRef}
          {...listeners}
          {...attributes}
          className="cursor-grab touch-none rounded-sm p-0.5 active:cursor-grabbing hover:bg-amber-500/10"
          aria-label={`Drag to reorder outcome ${index + 1}`}
        >
          <Crown
            className={cn(
              "h-4 w-4 shrink-0 transition-all",
              done
                ? "text-amber-500 drop-shadow-[0_0_4px_hsl(45_100%_50%_/_0.5)]"
                : "text-amber-500/60",
            )}
            fill="currentColor"
            aria-hidden="true"
          />
        </button>
        <Checkbox
          checked={done}
          onCheckedChange={(checked) => onToggle(index, checked === true)}
          aria-label={`Outcome ${index + 1} completed`}
        />
        <Input
          value={value}
          onChange={(e) => onValueChange(index, e.target.value)}
          onBlur={() => {
            if (dirty) onSave(index);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSave(index);
            }
          }}
          placeholder={`${label} outcome...`}
          className={cn(
            "h-auto border-0 bg-transparent px-0 py-0.5 text-sm leading-snug shadow-none focus-visible:ring-0 rounded-none",
            done && "text-muted-foreground line-through",
          )}
        />
        {dirty && (
          <Button
            size="xs"
            variant="ghost"
            onClick={() => onSave(index)}
            disabled={saving}
            aria-label={`Save outcome ${index + 1}`}
          >
            <Save className="h-3 w-3" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function TopOutcomes({
  outcomes,
  completed,
  onSave,
  onToggle,
  onReorder,
  viewMode = "full",
}: TopOutcomesProps) {
  const [values, setValues] = useState<[string, string, string]>(["", "", ""]);
  const [completedState, setCompletedState] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [dirty, setDirty] = useState<[boolean, boolean, boolean]>([
    false,
    false,
    false,
  ]);
  const [saving, setSaving] = useState<[boolean, boolean, boolean]>([
    false,
    false,
    false,
  ]);
  const [, setActiveId] = useState<string | null>(null);
  const [itemIds, setItemIds] = useState<string[]>(["outcome-0", "outcome-1", "outcome-2"]);
  const labels = ["First", "Second", "Third"];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    startTransition(() => {
      setValues([
        outcomes[0] ?? "",
        outcomes[1] ?? "",
        outcomes[2] ?? "",
      ]);
      setCompletedState([completed[0], completed[1], completed[2]]);
    });
  }, [outcomes, completed]);

  const handleValueChange = useCallback(
    (index: number, text: string) => {
      setValues((prev) => {
        const next = [...prev] as [string, string, string];
        next[index] = text;
        return next;
      });
      setDirty((prev) => {
        const next = [...prev] as [boolean, boolean, boolean];
        next[index] = true;
        return next;
      });
    },
    [],
  );

  const handleSave = useCallback(
    async (index: number) => {
      if (saving[index] || !dirty[index]) return;
      setSaving((prev) => {
        const next = [...prev] as [boolean, boolean, boolean];
        next[index] = true;
        return next;
      });
      try {
        await onSave(index, values[index]);
        setDirty((prev) => {
          const next = [...prev] as [boolean, boolean, boolean];
          next[index] = false;
          return next;
        });
      } finally {
        setSaving((prev) => {
          const next = [...prev] as [boolean, boolean, boolean];
          next[index] = false;
          return next;
        });
      }
    },
    [values, dirty, saving, onSave],
  );

  const handleToggle = useCallback(
    (index: number, checked: boolean) => {
      setCompletedState((prev) => {
        const next = [...prev] as [boolean, boolean, boolean];
        next[index] = checked;
        return next;
      });
      onToggle(index, checked);
    },
    [onToggle],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = itemIds.indexOf(active.id as string);
      const newIndex = itemIds.indexOf(over.id as string);

      const newValues = arrayMove([...values], oldIndex, newIndex) as [string, string, string];
      const newDirty = arrayMove([...dirty], oldIndex, newIndex) as [boolean, boolean, boolean];
      const newSaving = arrayMove([...saving], oldIndex, newIndex) as [boolean, boolean, boolean];
      const newCompleted = arrayMove([...completed], oldIndex, newIndex) as [boolean, boolean, boolean];
      const newItemIds = arrayMove([...itemIds], oldIndex, newIndex);

      setValues(newValues);
      setCompletedState(newCompleted);
      setDirty(newDirty);
      setSaving(newSaving);
      setItemIds(newItemIds);

      onReorder(
        newValues.map((text, i) => ({ text, completed: newCompleted[i] })),
      );
    },
    [values, dirty, saving, completed, itemIds, onReorder],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  return (
    <section>
      <div className="mb-1 flex items-center gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Top 3 Outcomes
        </h2>
      </div>
      {viewMode === "full" && (
        <SectionTooltip>
          <p>
            Your <strong>top 3 outcomes</strong> are the most important things you
            want to accomplish today.
          </p>
          <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs">
            <li>Write them down each morning to set today&apos;s priorities</li>
            <li>Focus on completing these before anything else</li>
            <li>Check them off as you finish for a sense of progress</li>
            <li>
              Completing all 3 means the day was a win — regardless of distractions
            </li>
          </ul>
        </SectionTooltip>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={itemIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {itemIds.map((id, i) => (
              <SortableCard
                key={id}
                id={id}
                index={i}
                value={values[i]}
                done={completedState[i]}
                dirty={dirty[i]}
                saving={saving[i]}
                label={labels[i]}
                onValueChange={handleValueChange}
                onSave={handleSave}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}

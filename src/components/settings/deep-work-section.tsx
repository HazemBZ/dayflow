"use client";

import { startTransition, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  addDeepWorkActivity,
  deleteDeepWorkActivity,
  getDeepWorkActivities,
} from "@/lib/actions/deep-work";
import type { FeedbackHandler } from "@/components/settings/types";

type DeepWorkItem = Awaited<ReturnType<typeof getDeepWorkActivities>>[number];

type DeepWorkSectionProps = {
  readonly showFeedback: FeedbackHandler;
};

export function DeepWorkSection({ showFeedback }: DeepWorkSectionProps) {
  const [activities, setActivities] = useState<readonly DeepWorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  async function loadActivities(): Promise<void> {
    const activities = await getDeepWorkActivities();
    startTransition(() => setActivities(activities));
  }

  useEffect(() => {
    void (async () => {
      try {
        await loadActivities();
      } catch (error) {
        if (error instanceof Error) {
          showFeedback("Failed to load activities", false);
          return;
        }
        throw error;
      } finally {
        startTransition(() => setLoading(false));
      }
    })();
  }, [showFeedback]);

  async function handleAdd(): Promise<void> {
    const name = newName.trim();
    if (!name) return;

    setAdding(true);
    try {
      await addDeepWorkActivity({ name });
      setNewName("");
      showFeedback("Activity added", true);
      await loadActivities();
    } catch (error) {
      if (error instanceof Error) {
        showFeedback("Failed to add activity", false);
      } else {
        throw error;
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: number): Promise<void> {
    try {
      await deleteDeepWorkActivity(id);
      showFeedback("Activity deleted", true);
      await loadActivities();
    } catch (error) {
      if (error instanceof Error) {
        showFeedback("Failed to delete activity", false);
      } else {
        throw error;
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deep Work Activities</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-10 w-full animate-pulse rounded-lg bg-muted/30" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activities yet. Add one below.</p>
        ) : (
          <div className="space-y-2">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <span className="text-sm font-medium">{activity.name}</span>
                <Button variant="ghost" size="icon" onClick={() => void handleDelete(activity.id)} aria-label={`Delete ${activity.name}`}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input placeholder="Activity name" value={newName} onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void handleAdd(); }} />
          <Button onClick={() => void handleAdd()} disabled={adding || !newName.trim()}>
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

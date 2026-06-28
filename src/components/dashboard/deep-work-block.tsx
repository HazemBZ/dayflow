"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import {
  Play, Square, Timer, BookOpen, RefreshCw, Cloud, Container,
  Users, Crown, GitBranch, Code, Plus,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SectionTooltip } from "@/components/ui/section-tooltip";
import { timerStore } from "@/lib/timer-store";
import { cn } from "@/lib/utils";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

const ICON_MAP: Record<string, typeof BookOpen> = {
  "book-open": BookOpen, "refresh-cw": RefreshCw, "cloud": Cloud,
  "container": Container, "users": Users, "crown": Crown,
  "git-branch": GitBranch, "code": Code,
};

interface Activity {
  id: number;
  name: string;
  icon: string;
}

interface SkillSession {
  id: number;
  skill: string;
  durationMinutes: number;
  completed: boolean | number;
  notes: string | null;
}

interface DeepWorkBlockProps {
  activities: Activity[];
  sessions: SkillSession[];
  onLogSession: (params: {
    skill: string;
    durationMinutes: number;
    notes?: string;
  }) => Promise<void>;
  onAddActivity: (name: string) => Promise<void>;
  viewMode?: "simple" | "full";
}

const ADD_NEW_VALUE = "__add_new__";

function ActivityIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = ICON_MAP[icon] ?? BookOpen;
  return <Icon className={className} />;
}

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function DeepWorkBlock({
  activities,
  sessions,
  onLogSession,
  onAddActivity,
  viewMode = "full",
}: DeepWorkBlockProps) {
  const { elapsed, running, activity: currentTimerActivity } = useSyncExternalStore(
    timerStore.subscribe,
    timerStore.getSnapshot,
    timerStore.getServerSnapshot,
  );
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // activity selection
  const [selectedActivity, setSelectedActivity] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const currentActivity = activities.find((a) => a.name === selectedActivity);

  // Sync selected activity from running timer (e.g. after navigation back)
  useEffect(() => {
    if (running && currentTimerActivity) {
      setSelectedActivity(currentTimerActivity);
    }
  }, [running, currentTimerActivity]);

  const startTimer = useCallback(() => {
    if (!selectedActivity) return;
    timerStore.start(selectedActivity);
    setShowNotes(false);
    setNotes("");
  }, [selectedActivity]);

  const stopTimer = useCallback(() => {
    const finalElapsed = timerStore.stop();
    setSessionElapsed(finalElapsed);
    setShowNotes(true);
  }, []);

  const handleSaveSession = useCallback(async () => {
    if (!selectedActivity || sessionElapsed < 60000) return;
    setSaving(true);
    try {
      const durationMinutes = Math.round(sessionElapsed / 1000 / 60);
      await onLogSession({
        skill: selectedActivity,
        durationMinutes,
        notes: notes || undefined,
      });
      setShowNotes(false);
      setSessionElapsed(0);
      setNotes("");
    } finally {
      setSaving(false);
    }
  }, [selectedActivity, sessionElapsed, notes, onLogSession]);

  const handleSelectChange = useCallback((val: string | null) => {
    if (!val) return;
    if (val === ADD_NEW_VALUE) {
      setDialogOpen(true);
    } else {
      setSelectedActivity(val);
    }
  }, []);

  const handleAddActivity = useCallback(async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await onAddActivity(newName.trim());
      setSelectedActivity(newName.trim());
      setNewName("");
      setDialogOpen(false);
    } finally {
      setAdding(false);
    }
  }, [newName, onAddActivity]);

  const totalMinutesToday = sessions.reduce(
    (sum, s) => sum + s.durationMinutes,
    0,
  );

  // ── Empty state: no activities ───────────────────────────────────────
  if (activities.length === 0) {
    if (viewMode === "simple") {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            Deep Work Block
            <span className="ml-auto font-mono text-xs tabular-nums tracking-tight opacity-60">
              {formatElapsed(elapsed)}
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Activity
          </Button>
        </div>
      );
    }

    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            Deep Work Block
            <span className="ml-auto font-mono text-xs tabular-nums tracking-tight opacity-60">
              {formatElapsed(elapsed)}
            </span>
          </CardTitle>
          <SectionTooltip>
            <p>
              <strong>Deep work</strong> is focused, uninterrupted time spent on
              your most important skill-building activities.
            </p>
            <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs">
              <li>Pick an activity and start the timer</li>
              <li>Work without interruptions until the session ends</li>
              <li>Add notes about what you learned</li>
              <li>Daily practice builds a compounding skill advantage</li>
            </ul>
          </SectionTooltip>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            No activities yet. Add one to start tracking deep work.
          </p>
          <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Activity
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── No activity selected ──────────────────────────────────────────────
  if (!selectedActivity || !currentActivity) {
    if (viewMode === "simple") {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BookOpen className="h-4 w-4" />
            Deep Work Block
            <span className="ml-auto font-mono text-xs tabular-nums tracking-tight text-muted-foreground/60">
              {formatElapsed(elapsed)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Select value="" onValueChange={handleSelectChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose activity" />
              </SelectTrigger>
              <SelectContent>
                {activities.map((a) => (
                  <SelectItem key={a.id} value={a.name}>
                    <div className="flex items-center gap-2">
                      <ActivityIcon icon={a.icon} className="h-3.5 w-3.5" />
                      {a.name}
                    </div>
                  </SelectItem>
                ))}
                <SelectItem value={ADD_NEW_VALUE}>
                  <div className="flex items-center gap-2 text-primary">
                    <Plus className="h-3.5 w-3.5" />
                    Add New Activity
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Timer — always visible, disabled until activity selected */}
          <div className="flex items-center gap-3">
            <div className="font-mono text-3xl tabular-nums tracking-tight text-muted-foreground">
              {formatElapsed(elapsed)}
            </div>
            <Button
              size="sm"
              variant="default"
              disabled
              className="gap-1.5"
            >
              <Play className="h-3.5 w-3.5" />
              Start
            </Button>
          </div>

          {/* Show today's sessions even without selected activity */}
          {sessions.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  Today&apos;s sessions ({totalMinutesToday}m total)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {sessions.map((s) => (
                    <Badge key={s.id} variant="secondary" className="gap-1">
                      <Timer className="h-2.5 w-2.5" />
                      {s.durationMinutes}m
                      {s.notes && (
                        <span className="max-w-[120px] truncate text-muted-foreground">
                          — {s.notes}
                        </span>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      );
    }

    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Deep Work Block
            <span className="ml-auto font-mono text-xs tabular-nums tracking-tight text-muted-foreground/60">
              {formatElapsed(elapsed)}
            </span>
          </CardTitle>
          <SectionTooltip>
            <p>
              <strong>Deep work</strong> is focused, uninterrupted time spent on
              your most important skill-building activities.
            </p>
            <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs">
              <li>Pick an activity and start the timer</li>
              <li>Work without interruptions until the session ends</li>
              <li>Add notes about what you learned</li>
              <li>Daily practice builds a compounding skill advantage</li>
            </ul>
          </SectionTooltip>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select an activity to start your deep work session.
          </p>
          <div className="flex items-center gap-2">
            <Select value="" onValueChange={handleSelectChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose activity" />
              </SelectTrigger>
              <SelectContent>
                {activities.map((a) => (
                  <SelectItem key={a.id} value={a.name}>
                    <div className="flex items-center gap-2">
                      <ActivityIcon icon={a.icon} className="h-3.5 w-3.5" />
                      {a.name}
                    </div>
                  </SelectItem>
                ))}
                <SelectItem value={ADD_NEW_VALUE}>
                  <div className="flex items-center gap-2 text-primary">
                    <Plus className="h-3.5 w-3.5" />
                    Add New Activity
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Timer — always visible, disabled until activity selected */}
          <div className="flex items-center gap-4">
            <div className="font-mono text-3xl tabular-nums tracking-tight text-muted-foreground">
              {formatElapsed(elapsed)}
            </div>
            <Button
              size="sm"
              variant="default"
              disabled
              className="gap-1.5"
            >
              <Play className="h-3.5 w-3.5" />
              Start
            </Button>
          </div>

          {/* Show today's sessions even without selected activity */}
          {sessions.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  Today&apos;s sessions ({totalMinutesToday}m total)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {sessions.map((s) => (
                    <Badge key={s.id} variant="secondary" className="gap-1">
                      <Timer className="h-2.5 w-2.5" />
                      {s.durationMinutes}m
                      {s.notes && (
                        <span className="max-w-[120px] truncate text-muted-foreground">
                          — {s.notes}
                        </span>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── Active: selected activity + timer ────────────────────────────────
  if (viewMode === "simple") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ActivityIcon icon={currentActivity.icon} className="h-4 w-4 text-primary" />
          Deep Work: {currentActivity.name}
          <span
            className={cn(
              "ml-auto font-mono text-base tabular-nums tracking-tight transition-colors",
              running ? "text-foreground" : "text-muted-foreground/60",
            )}
          >
            {formatElapsed(elapsed)}
          </span>
        </div>

        {/* Activity selector (allow changing mid-session) */}
        <Select value={selectedActivity} onValueChange={handleSelectChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {activities.map((a) => (
              <SelectItem key={a.id} value={a.name}>
                <div className="flex items-center gap-2">
                  <ActivityIcon icon={a.icon} className="h-3.5 w-3.5" />
                  {a.name}
                </div>
              </SelectItem>
            ))}
            <SelectItem value={ADD_NEW_VALUE}>
              <div className="flex items-center gap-2 text-primary">
                <Plus className="h-3.5 w-3.5" />
                Add New Activity
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Timer */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "font-mono text-3xl tabular-nums tracking-tight transition-colors",
              running ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {formatElapsed(elapsed)}
          </div>
          {!running && !showNotes ? (
            <Button
              size="sm"
              variant="default"
              onClick={startTimer}
              className="gap-1.5"
            >
              <Play className="h-3.5 w-3.5" />
              Start
            </Button>
          ) : running ? (
            <Button
              size="sm"
              variant="outline"
              onClick={stopTimer}
              className="gap-1.5"
            >
              <Square className="h-3.5 w-3.5" />
              Stop
            </Button>
          ) : null}
        </div>

        {/* Notes input after stop */}
        {showNotes && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <Textarea
              placeholder="What did you work on? (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px] text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSaveSession}
                disabled={saving || sessionElapsed < 60000}
              >
                <Timer className="mr-1 h-3.5 w-3.5" />
                {saving
                  ? "Saving..."
                  : `Save ${Math.round(sessionElapsed / 1000 / 60)} min session`}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowNotes(false);
                  setSessionElapsed(0);
                }}
              >
                Discard
              </Button>
            </div>
            {sessionElapsed < 60000 && (
              <p className="text-xs text-muted-foreground">
                Sessions under 1 minute won&apos;t be saved.
              </p>
            )}
          </div>
        )}

        {/* Completed sessions today */}
        {sessions.length > 0 && (
          <>
            <Separator />
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Today&apos;s sessions ({totalMinutesToday}m total)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sessions.map((s) => (
                  <Badge key={s.id} variant="secondary" className="gap-1">
                    <Timer className="h-2.5 w-2.5" />
                    {s.durationMinutes}m
                    {s.notes && (
                      <span className="max-w-[120px] truncate text-muted-foreground">
                        — {s.notes}
                      </span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Add New Activity Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Activity</DialogTitle>
              <DialogDescription>
                Add a new activity to your deep work list.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Input
                placeholder="e.g. System Design"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddActivity();
                }}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddActivity} disabled={adding || !newName.trim()}>
                {adding ? "Adding..." : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.03] to-primary/[0.08] dark:from-primary/[0.05] dark:to-primary/[0.12]">
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-primary/10" />
      <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ActivityIcon icon={currentActivity.icon} className="h-4 w-4 text-primary" />
            Deep Work: {currentActivity.name}
            <span
              className={cn(
                "ml-auto font-mono text-base tabular-nums tracking-tight transition-colors",
                running ? "text-foreground" : "text-muted-foreground/60",
              )}
            >
              {formatElapsed(elapsed)}
            </span>
          </CardTitle>
          <SectionTooltip>
            <p>
              <strong>Deep work</strong> is focused, uninterrupted time spent on
              your most important skill-building activities.
            </p>
            <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs">
              <li>Pick an activity and start the timer</li>
              <li>Work without interruptions until the session ends</li>
              <li>Add notes about what you learned</li>
              <li>Daily practice builds a compounding skill advantage</li>
            </ul>
          </SectionTooltip>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Activity selector (allow changing mid-session) */}
        <Select value={selectedActivity} onValueChange={handleSelectChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {activities.map((a) => (
              <SelectItem key={a.id} value={a.name}>
                <div className="flex items-center gap-2">
                  <ActivityIcon icon={a.icon} className="h-3.5 w-3.5" />
                  {a.name}
                </div>
              </SelectItem>
            ))}
            <SelectItem value={ADD_NEW_VALUE}>
              <div className="flex items-center gap-2 text-primary">
                <Plus className="h-3.5 w-3.5" />
                Add New Activity
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Timer */}
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "font-mono text-3xl tabular-nums tracking-tight transition-colors",
              running ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {formatElapsed(elapsed)}
          </div>
          {!running && !showNotes ? (
            <Button
              size="sm"
              variant="default"
              onClick={startTimer}
              className="gap-1.5"
            >
              <Play className="h-3.5 w-3.5" />
              Start
            </Button>
          ) : running ? (
            <Button
              size="sm"
              variant="outline"
              onClick={stopTimer}
              className="gap-1.5"
            >
              <Square className="h-3.5 w-3.5" />
              Stop
            </Button>
          ) : null}
        </div>

        {/* Notes input after stop */}
        {showNotes && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <Textarea
              placeholder="What did you work on? (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px] text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSaveSession}
                disabled={saving || sessionElapsed < 60000}
              >
                <Timer className="mr-1 h-3.5 w-3.5" />
                {saving
                  ? "Saving..."
                  : `Save ${Math.round(sessionElapsed / 1000 / 60)} min session`}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowNotes(false);
                  setSessionElapsed(0);
                }}
              >
                Discard
              </Button>
            </div>
            {sessionElapsed < 60000 && (
              <p className="text-xs text-muted-foreground">
                Sessions under 1 minute won&apos;t be saved.
              </p>
            )}
          </div>
        )}

        {/* Completed sessions today */}
        {sessions.length > 0 && (
          <>
            <Separator />
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Today&apos;s sessions ({totalMinutesToday}m total)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sessions.map((s) => (
                  <Badge key={s.id} variant="secondary" className="gap-1">
                    <Timer className="h-2.5 w-2.5" />
                    {s.durationMinutes}m
                    {s.notes && (
                      <span className="max-w-[120px] truncate text-muted-foreground">
                        — {s.notes}
                      </span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>

      {/* Add New Activity Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Activity</DialogTitle>
            <DialogDescription>
              Add a new activity to your deep work list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              placeholder="e.g. System Design"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddActivity();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddActivity} disabled={adding || !newName.trim()}>
              {adding ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

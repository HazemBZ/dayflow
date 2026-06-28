"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { format, parseISO } from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageScroll } from "@/components/ui/page-scroll";
import { getAllPastDays, type DaySummary } from "@/lib/actions/history";
import {
  updateSkillSession,
  deleteSkillSession,
} from "@/lib/actions/daily";
import { Pencil, Trash2 } from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────────

function parseOutcome(
  text: string | null,
): { clean: string; completed: boolean } {
  if (!text) return { clean: "", completed: false };
  if (text.startsWith("[x] ")) return { clean: text.slice(4), completed: true };
  return { clean: text, completed: false };
}

const EVENING_LABELS: Record<string, string> = {
  applications: "Job Applications",
  cv: "CV / Resume",
  linkedin: "LinkedIn",
  networking: "Networking",
};

const CATEGORY_LABELS: Record<string, string> = {
  job_leadership: "Leadership",
  immigration_apps: "Immigration Apps",
  terraform: "Terraform",
  aws: "AWS",
  kubernetes: "Kubernetes",
  interview_prep: "Interview Prep",
  networking: "Networking",
  showcase_project: "Showcase Project",
  ai_exploration: "AI Exploration",
};

function totalDeepWorkHours(days: DaySummary[]): number {
  let total = 0;
  for (const d of days) {
    for (const s of d.skillSessions) {
      total += s.durationMinutes;
    }
  }
  return Math.round((total / 60) * 10) / 10;
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [days, setDays] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());
  const [editingSession, setEditingSession] = useState<{
    id: number;
    skill: string;
    durationMinutes: number;
    notes: string;
  } | null>(null);
  const [editDraft, setEditDraft] = useState({ skill: "", durationMinutes: 0, notes: "" });
  const [deletingSession, setDeletingSession] = useState<{ id: number; skill: string } | null>(null);

  const openEdit = useCallback(
    (s: { id: number; skill: string; durationMinutes: number; notes: string | null }) => {
      setEditingSession({ id: s.id, skill: s.skill, durationMinutes: s.durationMinutes, notes: s.notes ?? "" });
      setEditDraft({ skill: s.skill, durationMinutes: s.durationMinutes, notes: s.notes ?? "" });
    },
    [],
  );

  const closeEdit = useCallback(() => {
    setEditingSession(null);
    setEditDraft({ skill: "", durationMinutes: 0, notes: "" });
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editingSession) return;
    await updateSkillSession(editingSession.id, {
      skill: editDraft.skill,
      durationMinutes: editDraft.durationMinutes,
      notes: editDraft.notes || null,
    });
    closeEdit();
    const days = await getAllPastDays();
    setDays(days);
  }, [editingSession, editDraft, closeEdit]);

  const confirmDelete = useCallback(async () => {
    if (!deletingSession) return;
    await deleteSkillSession(deletingSession.id);
    setDeletingSession(null);
    const days = await getAllPastDays();
    setDays(days);
  }, [deletingSession]);

  const toggleSession = useCallback((id: number) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    getAllPastDays()
      .then(setDays)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    if (days.length === 0) return null;
    return {
      totalDays: days.length,
      deepWorkHours: totalDeepWorkHours(days),
      avgOutcomes:
        Math.round(
          (days.reduce((sum, d) => {
            let count = 0;
            if (d.log.outcome1) count++;
            if (d.log.outcome2) count++;
            if (d.log.outcome3) count++;
            return sum + count;
          }, 0) /
            days.length) *
            10,
        ) / 10,
      eveningRate: Math.round(
        (days.filter((d) => d.log.eveningCompleted).length / days.length) * 100,
      ),
    };
  }, [days]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 py-6">
        <div className="h-10 w-48 animate-pulse rounded bg-muted" />
        <div className="h-6 w-72 animate-pulse rounded bg-muted" />
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 pb-16">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            History
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Past days activity log
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <p className="text-lg font-medium text-muted-foreground">
              No days logged yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start by filling in your daily dashboard
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PageScroll
      header={
        <div className="bg-background px-5 py-2 rounded-xl shadow-sm border">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            History
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Past days activity log
          </p>
        </div>
      }
      maxWidth="max-w-3xl"
      scrollContentClass="space-y-6 pt-6"
    >
      {/* ── Stats bar ───────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold tabular-nums">{stats.totalDays}</p>
              <p className="text-xs text-muted-foreground">Days logged</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold tabular-nums">
                {stats.deepWorkHours}h
              </p>
              <p className="text-xs text-muted-foreground">Deep work total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold tabular-nums">
                {stats.avgOutcomes}
              </p>
              <p className="text-xs text-muted-foreground">Avg outcomes/day</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold tabular-nums">
                {stats.eveningRate}%
              </p>
              <p className="text-xs text-muted-foreground">Evening completion</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Day cards ───────────────────────────────────────── */}
      <div className="space-y-4">
        {days.map((day) => {
          const outcomes = [
            parseOutcome(day.log.outcome1),
            parseOutcome(day.log.outcome2),
            parseOutcome(day.log.outcome3),
          ];
          const hasOutcomes = outcomes.some((o) => o.clean);
          const hasDeepWork = day.log.deepWorkTopic || day.skillSessions.length > 0;
          const hasEvening = day.log.eveningTaskType;
          const hasProtections = day.protectionLogs.length > 0;
          const hasTime = day.timeLogs.length > 0;
          const hasNotes = day.log.notes;

          const totalMins = day.skillSessions.reduce(
            (s, s2) => s + s2.durationMinutes,
            0,
          );

          return (
            <Card key={day.log.id}>
              {/* Date header */}
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {format(parseISO(day.log.date), "EEEE, MMMM d, yyyy")}
                    </CardTitle>
                    <CardDescription>
                      {format(parseISO(day.log.date), "yyyy-MM-dd")}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1.5">
                    {day.log.deepWorkCompleted && (
                      <Badge
                        variant="outline"
                        className="border-indigo-500/30 bg-indigo-500/10 text-indigo-500 dark:border-indigo-400/30 dark:bg-indigo-400/10 dark:text-indigo-400"
                      >
                        Deep work
                      </Badge>
                    )}
                    {day.log.eveningCompleted && (
                      <Badge
                        variant="outline"
                        className="border-amber-500/30 bg-amber-500/10 text-amber-500 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-400"
                      >
                        Evening done
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Outcomes */}
                {hasOutcomes && (
                  <div>
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Top Outcomes
                    </p>
                    <ul className="space-y-0.5">
                      {outcomes.map(
                        (o, i) =>
                          o.clean && (
                            <li
                              key={i}
                              className="flex items-center gap-2 text-sm"
                            >
                              <span
                                className={
                                  o.completed
                                    ? "text-green-500"
                                    : "text-muted-foreground"
                                }
                              >
                                {o.completed ? "✓" : "○"}
                              </span>
                              <span
                                className={
                                  o.completed
                                    ? "text-muted-foreground line-through"
                                    : ""
                                }
                              >
                                {o.clean}
                              </span>
                            </li>
                          ),
                      )}
                    </ul>
                  </div>
                )}

                {/* Deep work */}
                {hasDeepWork && (
                  <div>
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Deep Work
                    </p>
                    {day.log.deepWorkTopic && (
                      <p className="text-sm">
                        <span className="font-medium">Topic: </span>
                        {day.log.deepWorkTopic}
                      </p>
                    )}
                    {day.skillSessions.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {day.skillSessions.map((s) => {
                          const isExpanded = expandedSessions.has(s.id);
                          const hasNotes = !!s.notes;
                          return (
                            <div key={s.id}>
                              <div className="group flex items-center gap-2 rounded-md px-2.5 py-1 text-sm transition-colors hover:bg-muted/50">
                                <span
                                  className={`flex-1 font-medium capitalize ${hasNotes ? "cursor-pointer" : ""}`}
                                  onClick={hasNotes ? () => toggleSession(s.id) : undefined}
                                >
                                  {s.skill.replace(/_/g, " ")}
                                </span>
                                <span className="tabular-nums text-muted-foreground">
                                  {s.durationMinutes}m
                                </span>
                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-6"
                                    onClick={() =>
                                      openEdit(s)
                                    }
                                  >
                                    <Pencil className="size-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-6 text-destructive hover:text-destructive"
                                    onClick={() =>
                                      setDeletingSession({ id: s.id, skill: s.skill })
                                    }
                                  >
                                    <Trash2 className="size-3" />
                                  </Button>
                                </div>
                                {s.notes && (
                                  <span
                                    className="text-[10px] text-muted-foreground cursor-pointer"
                                    onClick={() => toggleSession(s.id)}
                                  >
                                    {isExpanded ? "▲" : "▼"}
                                  </span>
                                )}
                              </div>
                              {hasNotes && (
                                <div
                                  className={`overflow-hidden transition-all duration-200 ease-in-out ${
                                    isExpanded ? "max-h-40" : "max-h-0"
                                  }`}
                                >
                                  <p className="ml-4 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed border-l-2 border-muted pl-3 pt-1">
                                    {s.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        <p className="text-xs text-muted-foreground px-2.5">
                          {totalMins >= 60
                            ? `${Math.floor(totalMins / 60)}h ${totalMins % 60}m`
                            : `${totalMins}m`}{" "}
                          total
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Evening */}
                {hasEvening && (
                  <div>
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Evening
                    </p>
                    <p className="text-sm">
                      {EVENING_LABELS[day.log.eveningTaskType ?? ""] ?? day.log.eveningTaskType}
                      {day.log.eveningCompleted
                        ? " ✓"
                        : " ○"}
                    </p>
                  </div>
                )}

                {/* Protection logs */}
                {hasProtections && (
                  <div>
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Protection Gate
                    </p>
                    <ul className="space-y-0.5">
                      {day.protectionLogs.map((p) => (
                        <li key={p.id} className="flex items-center gap-2 text-sm">
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase"
                          >
                            {p.actionTaken}
                          </Badge>
                          <span className="text-muted-foreground">
                            {p.requestDescription}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Time breakdown */}
                {hasTime && (
                  <div>
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Time Spent
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {day.timeLogs.map((t) => (
                        <Badge
                          key={t.id}
                          variant="outline"
                          className="text-[11px]"
                        >
                          {CATEGORY_LABELS[t.category] ?? t.category} ·{" "}
                          {t.hours}h
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {hasNotes && (
                  <div>
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Notes
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {day.log.notes}
                    </p>
                  </div>
                )}

                {/* Empty state for this day */}
                {!hasOutcomes &&
                  !hasDeepWork &&
                  !hasEvening &&
                  !hasProtections &&
                  !hasTime &&
                  !hasNotes && (
                    <p className="text-sm text-muted-foreground italic">
                      No activities recorded
                    </p>
                  )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      {/* ── Delete confirmation ──────────────────────────── */}
      <Dialog
        open={!!deletingSession}
        onOpenChange={(o) => !o && setDeletingSession(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Activity</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete{" "}
            <span className="font-medium text-foreground capitalize">
              {deletingSession?.skill.replace(/_/g, " ")}
            </span>
            ? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingSession(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit dialog ──────────────────────────────────── */}
      <Dialog open={!!editingSession} onOpenChange={(o) => !o && closeEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Activity
              </label>
              <Input
                value={editDraft.skill}
                onChange={(e) =>
                  setEditDraft((p) => ({ ...p, skill: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Duration (minutes)
              </label>
              <Input
                type="number"
                min={1}
                value={editDraft.durationMinutes}
                onChange={(e) =>
                  setEditDraft((p) => ({
                    ...p,
                    durationMinutes: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Notes
              </label>
              <Textarea
                rows={3}
                value={editDraft.notes}
                onChange={(e) =>
                  setEditDraft((p) => ({ ...p, notes: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEdit}>
              Cancel
            </Button>
            <Button onClick={handleEditSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageScroll>
  );
}

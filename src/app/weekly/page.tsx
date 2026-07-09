"use client";

import { useState, useEffect, startTransition } from "react";
import { startOfWeek, format, parseISO, addDays } from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Progress,
  ProgressTrack,
  ProgressIndicator,
} from "@/components/ui/progress";

import {
  getWeeklyPlan,
  upsertWeeklyPlan,
  getWeeklyScore,
  upsertWeeklyScore,
  getTimeLogsForWeek,
} from "@/lib/actions/weekly";
import { getSkillSessionsForWeek } from "@/lib/actions/daily";
import { SectionTooltip } from "@/components/ui/section-tooltip";
import { PageScroll } from "@/components/ui/page-scroll";
import { TIME_CATEGORIES } from "@/lib/constants";


type WeeklyPlan = Awaited<ReturnType<typeof getWeeklyPlan>>;
type WeeklyScore = Awaited<ReturnType<typeof getWeeklyScore>>;
type TimeLog = Awaited<ReturnType<typeof getTimeLogsForWeek>>[number];
type SkillSession = Awaited<ReturnType<typeof getSkillSessionsForWeek>>[number];

const TARGET_FIELD_KEYS = [
  "appsTarget",
  "networkingTarget",
  "learningHoursTarget",
  "projectHoursTarget",
  "aiExplorationHoursTarget",
  "terraformHours",
  "awsHours",
  "k8sHours",
] as const;

type TargetKey = (typeof TARGET_FIELD_KEYS)[number];

const PLAN_DEFAULTS: Record<TargetKey, number> = {
  appsTarget: 10,
  networkingTarget: 2,
  learningHoursTarget: 5,
  projectHoursTarget: 2,
  aiExplorationHoursTarget: 2,
  terraformHours: 2,
  awsHours: 2,
  k8sHours: 1,
};

const TARGET_KEY_META: Record<
  TargetKey,
  { label: string; unit: string; step: number }
> = {
  appsTarget: { label: "Apps", unit: "", step: 1 },
  networkingTarget: { label: "Networking", unit: "", step: 1 },
  learningHoursTarget: { label: "Learning", unit: "hrs", step: 0.5 },
  projectHoursTarget: { label: "Project", unit: "hrs", step: 0.5 },
  aiExplorationHoursTarget: {
    label: "AI Exploration",
    unit: "",
    step: 0.5,
  },
  terraformHours: { label: "Terraform", unit: "hrs", step: 0.5 },
  awsHours: { label: "AWS", unit: "hrs", step: 0.5 },
  k8sHours: { label: "K8s", unit: "hrs", step: 0.5 },
};

const CATEGORY_TARGET_MAP: Record<string, TargetKey> = {
  immigration_apps: "appsTarget",
  terraform: "terraformHours",
  aws: "awsHours",
  kubernetes: "k8sHours",
  networking: "networkingTarget",
  showcase_project: "projectHoursTarget",
  ai_exploration: "aiExplorationHoursTarget",
};

function getMonday(): string {
  const now = new Date();
  const monday = startOfWeek(now, { weekStartsOn: 1 });
  return format(monday, "yyyy-MM-dd");
}

export default function WeeklyPage() {
  const weekStart = getMonday();
  const mondayDate = parseISO(weekStart);
  const sundayDate = addDays(mondayDate, 6);
  const weekLabel = `${format(mondayDate, "MMM d")} – ${format(sundayDate, "MMM d, yyyy")}`;

  // ── Data state ──────────────────────────────────────────────────────
  const [, setPlan] = useState<WeeklyPlan | null>(null);
  const [, setScore] = useState<WeeklyScore | null>(null);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [skillSessions, setSkillSessions] = useState<SkillSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  // ── Form state – Plan targets (dynamic via Record) ──────────────────
  const [targetValues, setTargetValues] = useState<Record<TargetKey, number>>({
    ...PLAN_DEFAULTS,
  });
  const setTargetValue = (key: TargetKey, value: number) => {
    setTargetValues((prev) => ({ ...prev, [key]: value }));
  };

  // ── Form state – Leadership ─────────────────────────────────────────
  const [leadershipImprovement, setLeadershipImprovement] = useState("");
  const [leadershipCompleted, setLeadershipCompleted] = useState(false);

  // ── Form state – Scorecard ──────────────────────────────────────────
  const [appsSubmitted, setAppsSubmitted] = useState(0);
  const [networkingConversations, setNetworkingConversations] = useState(0);
  const [scoreLearningHours, setScoreLearningHours] = useState(0);
  const [showcaseProjectHours, setShowcaseProjectHours] = useState(0);
  const [scoreAiExplorationHours, setScoreAiExplorationHours] = useState(0);
  const [leadershipImproved, setLeadershipImproved] = useState(false);

  // ── Load data ───────────────────────────────────────────────────────
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const [planData, scoreData, logs, sessions] = await Promise.all([
          getWeeklyPlan(weekStart),
          getWeeklyScore(weekStart),
          getTimeLogsForWeek(weekStart),
          getSkillSessionsForWeek(weekStart),
        ]);
        if (ignore) return;
        startTransition(() => {
          if (planData) {
            const vals = { ...PLAN_DEFAULTS };
            for (const key of TARGET_FIELD_KEYS) {
              const planRecord = planData as Record<string, unknown>;
              const dbVal = planRecord[key] as number | undefined;
              if (dbVal != null) vals[key] = dbVal;
            }
            setTargetValues(vals);
            setLeadershipImprovement(
              planData.leadershipImprovement ?? "",
            );
            setLeadershipCompleted(
              planData.leadershipCompleted ?? false,
            );
          }
          if (scoreData) {
            setAppsSubmitted(
              scoreData.applicationsSubmitted ?? 0,
            );
            setNetworkingConversations(
              scoreData.networkingConversations ?? 0,
            );
            setScoreLearningHours(scoreData.learningHours ?? 0);
            setShowcaseProjectHours(
              scoreData.showcaseProjectHours ?? 0,
            );
            setScoreAiExplorationHours(
              scoreData.aiExplorationHours ?? 0,
            );
            setLeadershipImproved(
              scoreData.leadershipImproved ?? false,
            );
          }
          setPlan(planData);
          setScore(scoreData);
          setTimeLogs(logs);
          setSkillSessions(sessions);
        });
      } catch (e) {
        if (!ignore) console.error("Failed to load weekly data", e);
      } finally {
        if (!ignore) startTransition(() => setLoading(false));
      }
    })();
    return () => {
      ignore = true;
    };
  }, [weekStart]);

  // ── Feedback helper ─────────────────────────────────────────────────
  function showFeedback(msg: string, ok: boolean) {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3000);
  }

  // ── Save plan ───────────────────────────────────────────────────────
  async function handleSavePlan() {
    setSaving("plan");
    try {
      await upsertWeeklyPlan({
        weekStart,
        ...targetValues,
        leadershipImprovement,
        leadershipCompleted,
      });
      showFeedback("Plan saved", true);
    } catch {
      showFeedback("Failed to save plan", false);
    } finally {
      setSaving(null);
    }
  }

  // ── Save score ──────────────────────────────────────────────────────
  async function handleSaveScore() {
    setSaving("score");
    try {
      await upsertWeeklyScore({
        weekStart,
        applicationsSubmitted: appsSubmitted,
        networkingConversations,
        learningHours: scoreLearningHours,
        showcaseProjectHours,
        leadershipImproved,
        aiExplorationHours: scoreAiExplorationHours,
      });
      showFeedback("Scorecard saved", true);
    } catch {
      showFeedback("Failed to save score", false);
    } finally {
      setSaving(null);
    }
  }

  // ── Derived: time summary ───────────────────────────────────────────
  const categoryHours: Record<string, number> = {};
  for (const log of timeLogs) {
    categoryHours[log.category] = (categoryHours[log.category] ?? 0) + log.hours;
  }

  // ── Derived: plan lookup ────────────────────────────────────────────
  const planValues: Record<string, number> = targetValues;

  // ── Render ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 pt-6">
        <div className="space-y-3 rounded-xl border bg-background px-5 py-4 shadow-sm">
          <div className="h-7 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-4 rounded-xl border bg-card p-5 shadow-sm">
            <div className="space-y-2">
              <div className="h-5 w-36 animate-pulse rounded bg-muted" />
              <div className="h-3 w-56 animate-pulse rounded bg-muted/60" />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-20 animate-pulse rounded bg-muted/60" />
                  <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
            </div>
          </div>
          <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
            <div className="space-y-2">
              <div className="h-5 w-28 animate-pulse rounded bg-muted" />
              <div className="h-3 w-40 animate-pulse rounded bg-muted/60" />
            </div>
            <div className="h-20 w-full animate-pulse rounded-lg bg-muted" />
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-24 animate-pulse rounded bg-muted/60" />
            </div>
            <div className="flex justify-end">
              <div className="h-9 w-16 animate-pulse rounded-lg bg-muted" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {feedback && (
        <div
          className={`fixed right-4 top-4 z-50 rounded-lg px-4 py-2 text-sm shadow-lg transition-all ${
            feedback.ok
              ? "bg-primary text-primary-foreground"
              : "bg-destructive text-destructive-foreground"
          }`}
        >
          {feedback.msg}
        </div>
      )}
      <PageScroll
        header={
          <div className="rounded-xl shadow-sm border bg-background px-5 py-2">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Weekly Planner
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{weekLabel}</p>
          </div>
        }
        maxWidth="max-w-5xl"
        scrollContentClass="space-y-6 pt-6"
      >
        {/* ── Plan + Leadership row ────────────────────────────── */}
        <div className="grid gap-6 md:grid-cols-3">
        {/* Weekly Targets */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Weekly Targets</CardTitle>
            <CardDescription>
              Set your targets for the week across all focus areas
            </CardDescription>
            <SectionTooltip>
              <p>
                <strong>Weekly targets</strong> define your goals across all
                focus areas for the week.
              </p>
              <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs">
                <li>Set realistic numbers for apps, networking, learning, and project work</li>
                <li>Hours logged during the week are compared against these targets</li>
                <li>Adjust each week based on what you actually accomplish</li>
              </ul>
            </SectionTooltip>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {TARGET_FIELD_KEYS.map((key) => {
                const meta = TARGET_KEY_META[key];
                const labelFull =
                  meta.label + (meta.unit ? ` (${meta.unit})` : "");
                return (
                  <Field
                    key={key}
                    label={labelFull}
                    value={targetValues[key]}
                    onChange={(v) => setTargetValue(key, v)}
                    step={meta.step}
                  />
                );
              })}
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleSavePlan}
                disabled={saving === "plan"}
              >
                {saving === "plan" ? "Saving…" : "Save Targets"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Leadership Improvement */}
        <Card>
          <CardHeader>
            <CardTitle>Leadership</CardTitle>
            <CardDescription>One improvement this week</CardDescription>
            <SectionTooltip>
              <p>
                <strong>Leadership</strong> is your one personal growth goal for
                the week.
              </p>
              <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs">
                <li>Pick one concrete improvement — something you can actually do</li>
                <li>Check it off when you&apos;ve followed through</li>
                <li>Small weekly improvements compound into real growth</li>
              </ul>
            </SectionTooltip>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              placeholder="What will you improve?"
              value={leadershipImprovement}
              onChange={(e) => setLeadershipImprovement(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={leadershipCompleted}
                onCheckedChange={(v) =>
                  setLeadershipCompleted(v === true)
                }
              />
              <span className="text-muted-foreground">Completed</span>
            </label>
            <div className="flex justify-end">
              <Button onClick={handleSavePlan} disabled={saving === "plan"}>
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Scorecard Entry ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>This Week&apos;s Scorecard</CardTitle>
          <CardDescription>
            Record your results for the week
          </CardDescription>
            <SectionTooltip>
              <p>
                <strong>Scorecard</strong> is where you record your actual results
                for the week.
              </p>
              <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs">
                <li>Compare what you submitted vs what you planned</li>
                <li>Honest numbers help you improve your planning over time</li>
                <li>Check leadership improved if you followed through on your goal</li>
              </ul>
            </SectionTooltip>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Field
              label="Apps Submitted"
              value={appsSubmitted}
              onChange={setAppsSubmitted}
            />
            <Field
              label="Networking Convos"
              value={networkingConversations}
              onChange={setNetworkingConversations}
            />
            <Field
              label="Learning Hours"
              value={scoreLearningHours}
              onChange={setScoreLearningHours}
              step={0.5}
            />
            <Field
              label="Project Hours"
              value={showcaseProjectHours}
              onChange={setShowcaseProjectHours}
              step={0.5}
            />
            <Field
              label="AI Exploration"
              value={scoreAiExplorationHours}
              onChange={setScoreAiExplorationHours}
              step={0.5}
            />
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <Checkbox
                checked={leadershipImproved}
                onCheckedChange={(v) =>
                  setLeadershipImproved(v === true)
                }
              />
              <span className="text-muted-foreground">Leadership Improved</span>
            </label>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={handleSaveScore} disabled={saving === "score"}>
              {saving === "score" ? "Saving…" : "Save Scorecard"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Time Summary + Skill Sessions row ────────────────── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Time Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Time Summary</CardTitle>
            <CardDescription>
              Hours logged this week vs targets
            </CardDescription>
            <SectionTooltip>
              <p>
                <strong>Time Summary</strong> shows your logged hours compared to
                your weekly targets.
              </p>
              <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs">
                <li>Each bar compares hours logged (filled) vs target (total)</li>
                <li>No time logged yet? Start tracking from the daily dashboard</li>
                <li>Use this to rebalance your focus mid-week</li>
              </ul>
            </SectionTooltip>
          </CardHeader>
          <CardContent className="space-y-4">
            {TIME_CATEGORIES.map((cat) => {
              const logged = categoryHours[cat.value] ?? 0;
              const targetKey = CATEGORY_TARGET_MAP[cat.value];
              const target = targetKey ? planValues[targetKey] : undefined;
              const pct =
                target && target > 0
                  ? Math.min(Math.round((logged / target) * 100), 100)
                  : logged > 0
                    ? 100
                    : 0;

              return (
                <div key={cat.value} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{cat.label}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {logged.toFixed(1)}h
                      {target !== undefined && ` / ${target}h`}
                    </span>
                  </div>
                  <Progress value={pct}>
                    <ProgressTrack
                      className={`h-2 ${cat.color.replace("bg-", "bg-")}/20`}
                    >
                      <ProgressIndicator
                        className={`h-full rounded-full ${cat.color} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </ProgressTrack>
                  </Progress>
                </div>
              );
            })}
            {timeLogs.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No time logged this week yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Skill Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Skill Sessions This Week</CardTitle>
            <CardDescription>
              Deep work blocks across all skills
            </CardDescription>
            <SectionTooltip>
              <p>
                <strong>Skill sessions</strong> track every deep work block you
                completed across all skills.
              </p>
              <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs">
                <li>Each session shows the skill practiced and duration in minutes</li>
                <li>Days with sessions are marked — aim for a balanced rotation</li>
                <li>Consistent daily practice beats occasional marathons</li>
              </ul>
            </SectionTooltip>
          </CardHeader>
          <CardContent>
            {skillSessions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No skill sessions logged this week
              </p>
            ) : (
              <div className="space-y-3">
                {skillSessions.map((s, i) => (
                  <div
                    key={s.id ?? i}
                    className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-normal">
                        {s.skill}
                      </Badge>
                      <span className="text-muted-foreground">
                        {format(parseISO(s.date), "EEE")}
                      </span>
                    </div>
                    <span className="tabular-nums text-muted-foreground">
                      {s.durationMinutes}m
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageScroll>
  </>
  );
}

// ── Small field helper ──────────────────────────────────────────────
function Field({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <Input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  );
}

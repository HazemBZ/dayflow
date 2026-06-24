"use client";

import { useEffect, useState } from "react";
import type { ElementType } from "react";
import {
  format,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  getWeek,
  getQuarter,
} from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Laptop,
  Layers,
  Map,
  MessageCircle,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getDailyLog } from "@/lib/actions/daily";
import { getWeeklyScore, getAllScores } from "@/lib/actions/weekly";
import { cn } from "@/lib/utils";
import { PageScroll } from "@/components/ui/page-scroll";

// ─── Types ──────────────────────────────────────────────────────────────────

type DailyLog = Awaited<ReturnType<typeof getDailyLog>>;
type WeeklyScore = Awaited<ReturnType<typeof getWeeklyScore>>;
type AllScores = NonNullable<Awaited<ReturnType<typeof getAllScores>>>;

// ─── Animation Styles ────────────────────────────────────────────────────────

const animationStyles = `
@keyframes horizon-enter {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes progress-fill {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
.horizon-animate {
  animation: horizon-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
}
.horizon-animate:nth-child(1) { animation-delay: 0.05s; }
.horizon-animate:nth-child(2) { animation-delay: 0.15s; }
.horizon-animate:nth-child(3) { animation-delay: 0.25s; }
.horizon-animate:nth-child(4) { animation-delay: 0.35s; }
`;

// ─── Color Config ────────────────────────────────────────────────────────────

const ACCENT = {
  daily: { hex: "#10b981", bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.2)" },
  weekly: { hex: "#3b82f6", bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.2)" },
  monthly: { hex: "#a855f7", bg: "rgba(168,85,247,0.06)", border: "rgba(168,85,247,0.2)" },
  quarterly: { hex: "#f59e0b", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.2)" },
} as const;

// ─── Subcomponents ───────────────────────────────────────────────────────────

function TimelineBar() {
  return (
    <div
      aria-hidden
      className="absolute left-[19px] top-0 h-full w-0.5 md:left-1/2 md:-translate-x-1/2"
    >
      <div className="h-full w-full bg-gradient-to-b from-emerald-400 via-blue-500 via-purple-500 to-amber-400 opacity-40 dark:opacity-60" />
    </div>
  );
}

function TimelineDot({ color, index }: { color: string; index: number }) {
  const isLeft = index % 2 === 0;
  return (
    <div
      aria-hidden
      className={cn(
        "absolute top-6 z-10 size-4 rounded-full border-[3px] border-background transition-shadow duration-300",
        "left-[-8px]",
        isLeft ? "md:right-[-8px] md:left-auto" : "md:left-[-8px]",
      )}
      style={{
        backgroundColor: color,
        boxShadow: `0 0 0 3px ${color}40`,
      }}
    />
  );
}

function SimpleProgress({
  value,
  max,
  color,
  size = "sm",
}: {
  value: number;
  max: number;
  color: string;
  size?: "sm" | "md";
}) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "relative flex-1 overflow-hidden rounded-full bg-muted",
          size === "sm" ? "h-1.5" : "h-2",
        )}
      >
        <div
          className="h-full origin-left rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            animation: "progress-fill 1s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        />
      </div>
      <span className="min-w-[3rem] text-right text-xs tabular-nums text-muted-foreground">
        <span className="font-medium text-foreground">{value}</span>/{max}
      </span>
    </div>
  );
}

function StatusBadge({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {done ? (
        <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
      ) : (
        <XCircle className="size-4 shrink-0 text-muted-foreground/50" />
      )}
      <span className={cn(done ? "text-foreground" : "text-muted-foreground")}>{label}</span>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <Icon className="size-8 text-muted-foreground/40" />
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-xs text-muted-foreground/60">{description}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 w-2/5 rounded bg-muted" />
      <div className="h-3 w-3/5 rounded bg-muted" />
      <div className="h-2 w-full rounded bg-muted" />
      <div className="h-2 w-4/5 rounded bg-muted" />
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function HorizonPage() {
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [weeklyScore, setWeeklyScore] = useState<WeeklyScore | null>(null);
  const [allScores, setAllScores] = useState<AllScores>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const dateNow = new Date();
        const today = format(dateNow, "yyyy-MM-dd");
        const weekStart = format(startOfWeek(dateNow, { weekStartsOn: 1 }), "yyyy-MM-dd");

        const [log, score, scores] = await Promise.all([
          getDailyLog(today),
          getWeeklyScore(weekStart),
          getAllScores(),
        ]);
        setTodayLog(log);
        setWeeklyScore(score);
        setAllScores(scores ?? []);
      } catch (e) {
        console.error("Failed to load horizon data", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Derived Data ──
  const dateNow = new Date();
  const monthStart = format(startOfMonth(dateNow), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(dateNow), "yyyy-MM-dd");
  const weekNum = getWeek(dateNow, { weekStartsOn: 1 });
  const quarterNum = getQuarter(dateNow);
  const yearNum = dateNow.getFullYear();

  const monthlyScores = allScores.filter(
    (s) => s.weekStart >= monthStart && s.weekStart <= monthEnd,
  );
  const totalAppsMonth = monthlyScores.reduce(
    (sum, s) => sum + (s.applicationsSubmitted ?? 0),
    0,
  );
  const totalLearningMonth = monthlyScores.reduce(
    (sum, s) => sum + (s.learningHours ?? 0),
    0,
  );

  const outcomesCompleted = [todayLog?.outcome1, todayLog?.outcome2, todayLog?.outcome3].filter(
    (o) => typeof o === "string" && o.startsWith("[x]"),
  ).length;

  const quarterlyChecklist = [
    { key: "cloudSkills", label: "Cloud skills stronger than last quarter?", icon: Laptop },
    { key: "leadership", label: "Leadership experience improved?", icon: Users },
    { key: "interview", label: "Interview performance better?", icon: Target },
    { key: "recruiter", label: "Recruiter responses increasing?", icon: MessageCircle },
    { key: "interviews", label: "Interviews being received?", icon: CalendarDays },
    { key: "sponsorship", label: "Sponsorship opportunities appearing?", icon: Star },
  ] as const;

  // ── Render ──
  return (
    <>
      <style>{animationStyles}</style>
      <PageScroll
        scrollContentClass="pt-6"
        header={
          <div className="bg-background px-5 py-2 rounded-xl shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 via-blue-500 to-amber-400 shadow-lg">
                <Map className="size-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Horizon View</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Daily <ArrowRight className="inline size-3 align-middle" /> Weekly{" "}
                  <ArrowRight className="inline size-3 align-middle" /> Monthly{" "}
                  <ArrowRight className="inline size-3 align-middle" /> Quarterly
                </p>
              </div>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground/70">
              Your planning system — from today&apos;s execution to the big-picture quarter.
              Each horizon builds on the last.
            </p>
          </div>
        }
      >

      {/* ── Timeline ── */}
      <div className="relative">
        <TimelineBar />

        {/* ═══ DAILY HORIZON ═══ */}
        <div className="horizon-animate relative pb-14 md:w-1/2 md:pr-10 md:mr-auto">
          <TimelineDot color={ACCENT.daily.hex} index={0} />
          <div className="ml-10 md:ml-0">
            <Card
              className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
              style={{
                borderLeft: `3px solid ${ACCENT.daily.hex}`,
                background: `linear-gradient(135deg, ${ACCENT.daily.bg}, transparent)`,
              }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.03]"
                style={{
                  background: `radial-gradient(600px circle at 0% 0%, ${ACCENT.daily.hex}, transparent)`,
                }}
              />
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4" style={{ color: ACCENT.daily.hex }} />
                    <CardTitle className="text-base">Daily Execution</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                    {format(dateNow, "EEE, MMM d")}
                  </Badge>
                </div>
                <CardDescription>Today&apos;s building blocks</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <LoadingSkeleton />
                ) : !todayLog ? (
                  <EmptyState
                    icon={Sparkles}
                    title="No entries yet today"
                    description="Start your day by planning 3 outcomes"
                  />
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Outcomes Completed</span>
                        <span>{outcomesCompleted}/3</span>
                      </div>
                      <SimpleProgress value={outcomesCompleted} max={3} color={ACCENT.daily.hex} />
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-2">
                      <StatusBadge
                        done={todayLog.deepWorkCompleted ?? false}
                        label={todayLog.deepWorkTopic || "Deep Work"}
                      />
                      <StatusBadge
                        done={todayLog.eveningCompleted ?? false}
                        label={todayLog.eveningTaskType || "Evening Session"}
                      />
                    </div>

                    {(todayLog.deepWorkCompleted || todayLog.eveningCompleted) && (
                      <p className="text-xs italic text-muted-foreground/60">
                        {todayLog.deepWorkCompleted && todayLog.eveningCompleted
                          ? "Great momentum today!"
                          : todayLog.deepWorkCompleted
                            ? "Deep work done — finish the evening session"
                            : "Evening done — stay consistent tomorrow"}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ═══ WEEKLY HORIZON ═══ */}
        <div className="horizon-animate relative pb-14 md:w-1/2 md:pl-10 md:ml-auto">
          <TimelineDot color={ACCENT.weekly.hex} index={1} />
          <div className="ml-10 md:ml-0">
            <Card
              className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
              style={{
                borderLeft: `3px solid ${ACCENT.weekly.hex}`,
                background: `linear-gradient(135deg, ${ACCENT.weekly.bg}, transparent)`,
              }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.03]"
                style={{
                  background: `radial-gradient(600px circle at 0% 0%, ${ACCENT.weekly.hex}, transparent)`,
                }}
              />
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="size-4" style={{ color: ACCENT.weekly.hex }} />
                    <CardTitle className="text-base">Weekly Progress</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                    Week {weekNum}
                  </Badge>
                </div>
                <CardDescription>Scorecard and metrics this week</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <LoadingSkeleton />
                ) : !weeklyScore ? (
                  <EmptyState
                    icon={Target}
                    title="No scores this week"
                    description="Log your first weekly scorecard"
                  />
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Applications Submitted</span>
                        <span>{weeklyScore.applicationsSubmitted ?? 0} / 10 target</span>
                      </div>
                      <SimpleProgress
                        value={weeklyScore.applicationsSubmitted ?? 0}
                        max={10}
                        color={ACCENT.weekly.hex}
                      />
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Learning Hours</span>
                        <span>{weeklyScore.learningHours ?? 0} / 5 target</span>
                      </div>
                      <SimpleProgress
                        value={weeklyScore.learningHours ?? 0}
                        max={5}
                        color={ACCENT.weekly.hex}
                      />
                    </div>

                    <Separator />

                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MessageCircle className="size-3.5" />
                        Networking:{" "}
                        <span className="font-medium text-foreground">
                          {weeklyScore.networkingConversations ?? 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Star className="size-3.5" />
                        Leadership:{" "}
                        <span className="font-medium text-foreground">
                          {weeklyScore.leadershipImproved ? "Improved \u2713" : "Not logged"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ═══ MONTHLY HORIZON ═══ */}
        <div className="horizon-animate relative pb-14 md:w-1/2 md:pr-10 md:mr-auto">
          <TimelineDot color={ACCENT.monthly.hex} index={2} />
          <div className="ml-10 md:ml-0">
            <Card
              className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
              style={{
                borderLeft: `3px solid ${ACCENT.monthly.hex}`,
                background: `linear-gradient(135deg, ${ACCENT.monthly.bg}, transparent)`,
              }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.03]"
                style={{
                  background: `radial-gradient(600px circle at 0% 0%, ${ACCENT.monthly.hex}, transparent)`,
                }}
              />
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="size-4" style={{ color: ACCENT.monthly.hex }} />
                    <CardTitle className="text-base">Monthly Career Capital</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                    {format(dateNow, "MMMM")}
                  </Badge>
                </div>
                <CardDescription>Building assets that compound</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <LoadingSkeleton />
                ) : monthlyScores.length === 0 ? (
                  <EmptyState
                    icon={Layers}
                    title="No monthly data yet"
                    description="Scores from weekly check-ins appear here"
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border bg-background/50 p-3">
                        <p className="text-xs text-muted-foreground">Applications</p>
                        <p className="mt-0.5 text-2xl font-semibold tracking-tight">
                          {totalAppsMonth}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground/60">this month</p>
                      </div>
                      <div className="rounded-lg border bg-background/50 p-3">
                        <p className="text-xs text-muted-foreground">Learning Hours</p>
                        <p className="mt-0.5 text-2xl font-semibold tracking-tight">
                          {totalLearningMonth.toFixed(1)}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground/60">this month</p>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        Immigration Target
                      </p>
                      <Badge
                        variant="secondary"
                        className="gap-1.5 rounded-md px-2.5 py-1 text-xs font-normal"
                      >
                        <Map className="size-3" />
                        Canada / Europe / Remote
                      </Badge>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        Major Milestone
                      </p>
                      <div
                        className="rounded-lg border p-3 text-sm"
                        style={{
                          borderColor: ACCENT.monthly.border,
                          background: ACCENT.monthly.bg,
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles
                            className="size-4 shrink-0"
                            style={{ color: ACCENT.monthly.hex }}
                          />
                          <span className="font-medium">Terraform Fundamentals</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Core infrastructure-as-code — provider config, modules, state management
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ═══ QUARTERLY HORIZON ═══ */}
        <div className="horizon-animate relative md:w-1/2 md:pl-10 md:ml-auto">
          <TimelineDot color={ACCENT.quarterly.hex} index={3} />
          <div className="ml-10 md:ml-0">
            <Card
              className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
              style={{
                borderLeft: `3px solid ${ACCENT.quarterly.hex}`,
                background: `linear-gradient(135deg, ${ACCENT.quarterly.bg}, transparent)`,
              }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.03]"
                style={{
                  background: `radial-gradient(600px circle at 0% 0%, ${ACCENT.quarterly.hex}, transparent)`,
                }}
              />
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Map className="size-4" style={{ color: ACCENT.quarterly.hex }} />
                    <CardTitle className="text-base">Quarterly Major Outcomes</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                    Q{quarterNum} {yearNum}
                  </Badge>
                </div>
                <CardDescription>
                  Market value evaluation — is the strategy working?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Self-Evaluation Checklist
                  </p>

                  <div className="space-y-2">
                    {quarterlyChecklist.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.key}
                          className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm transition-colors hover:border-border hover:bg-muted"
                        >
                          <Icon className="size-4 shrink-0 text-muted-foreground/50" />
                          <span className="text-muted-foreground">{item.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  <Separator />

                  <div
                    className="flex items-start gap-3 rounded-lg border p-3 text-sm"
                    style={{
                      borderColor: `${ACCENT.quarterly.hex}30`,
                      background: `${ACCENT.quarterly.hex}08`,
                    }}
                  >
                    <AlertTriangle
                      className="mt-0.5 size-4 shrink-0"
                      style={{ color: ACCENT.quarterly.hex }}
                    />
                    <div>
                      <p className="font-medium text-muted-foreground">
                        Change strategy if no progress
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        If most items are unchecked by quarter end, it&apos;s time to re-evaluate
                        your approach. The market rewards results, not effort.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="mt-12 text-center">
        <p className="text-xs text-muted-foreground/50">
          Each horizon is a lens. Together they form the full picture.
        </p>
      </div>
      </PageScroll>
    </>
  );
}

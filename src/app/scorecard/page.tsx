"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageScroll } from "@/components/ui/page-scroll";
import { getAllScores } from "@/lib/actions/weekly";

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type Score = Awaited<ReturnType<typeof getAllScores>>[number];

const CHART_COLORS = {
  applications: "hsl(var(--chart-1))",
  networking: "hsl(var(--chart-2))",
  learning: "hsl(var(--chart-3))",
  project: "hsl(var(--chart-4))",
  aiExploration: "hsl(var(--chart-5))",
};

function toChartData(scores: Score[]) {
  return scores.map((s) => ({
    week: format(parseISO(s.weekStart), "M/d"),
    weekLabel: `Week of ${format(parseISO(s.weekStart), "MMM d, yyyy")}`,
    applications: s.applicationsSubmitted ?? 0,
    networking: s.networkingConversations ?? 0,
    learning: s.learningHours ?? 0,
    project: s.showcaseProjectHours ?? 0,
    aiExploration: s.aiExplorationHours ?? 0,
  }));
}

function tooltipStyle() {
  return {
    contentStyle: {
      background: "var(--popover)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)",
      fontSize: "0.875rem",
      color: "var(--popover-foreground)",
    },
    labelStyle: { fontWeight: 600 },
  };
}

export default function ScorecardPage() {
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const chartData = toChartData(scores);
  const recentScores = scores.slice(-8);

  useEffect(() => {
    getAllScores()
      .then(setScores)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 py-6 px-4 md:px-6 lg:px-8">
        {/* Header */}
        <div className="space-y-2 rounded-xl border bg-background px-5 py-4 shadow-sm">
          <div className="h-7 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted/60" />
        </div>

        {/* Applications Chart */}
        <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
          <div className="space-y-2">
            <div className="h-5 w-44 animate-pulse rounded bg-muted" />
            <div className="h-3 w-52 animate-pulse rounded bg-muted/60" />
          </div>
          <div className="h-64 w-full animate-pulse rounded-lg bg-muted/30" />
        </div>

        {/* Learning Chart */}
        <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
          <div className="space-y-2">
            <div className="h-5 w-36 animate-pulse rounded bg-muted" />
            <div className="h-3 w-56 animate-pulse rounded bg-muted/60" />
          </div>
          <div className="h-64 w-full animate-pulse rounded-lg bg-muted/30" />
        </div>

        {/* Combined Overview */}
        <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
          <div className="space-y-2">
            <div className="h-5 w-44 animate-pulse rounded bg-muted" />
            <div className="h-3 w-48 animate-pulse rounded bg-muted/60" />
          </div>
          <div className="h-72 w-full animate-pulse rounded-lg bg-muted/30" />
        </div>

        {/* Recent Scores Table */}
        <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
          <div className="space-y-2">
            <div className="h-5 w-36 animate-pulse rounded bg-muted" />
            <div className="h-3 w-48 animate-pulse rounded bg-muted/60" />
          </div>
          <div className="space-y-2">
            <div className="h-8 w-full animate-pulse rounded bg-muted/30" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-6 w-full animate-pulse rounded bg-muted/20" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (scores.length === 0) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 pb-16">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Scorecard Trends
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your weekly performance over time
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <p className="text-lg font-medium text-muted-foreground">
              No scores recorded yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start by entering scores on the Weekly Planner page
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
            Scorecard Trends
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your weekly performance over time
          </p>
        </div>
      }
      maxWidth="max-w-5xl"
      scrollContentClass="space-y-6 pt-6"
    >
      {/* ── Applications Chart (AreaChart) ────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Applications Submitted</CardTitle>
          <CardDescription>Weekly job application count</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient
                    id="appGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={CHART_COLORS.applications}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={CHART_COLORS.applications}
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  {...tooltipStyle()}
                  labelFormatter={(_, payload) =>
                    payload[0]?.payload?.weekLabel ?? ""
                  }
                />
                <Area
                  type="monotone"
                  dataKey="applications"
                  stroke={CHART_COLORS.applications}
                  fill="url(#appGradient)"
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.applications, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── Learning Hours Chart (LineChart) ──────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Learning Hours</CardTitle>
          <CardDescription>
            Weekly deep work & learning investment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  {...tooltipStyle()}
                  labelFormatter={(_, payload) =>
                    payload[0]?.payload?.weekLabel ?? ""
                  }
                />
                <Line
                  type="monotone"
                  dataKey="learning"
                  stroke={CHART_COLORS.learning}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.learning, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── Combined Overview ────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Combined Overview</CardTitle>
          <CardDescription>
            All key metrics across weeks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={35}
                />
                <Tooltip
                  {...tooltipStyle()}
                  labelFormatter={(_, payload) =>
                    payload[0]?.payload?.weekLabel ?? ""
                  }
                />
                <Legend
                  wrapperStyle={{ fontSize: "0.75rem", paddingTop: "0.5rem" }}
                />
                <Line
                  type="monotone"
                  dataKey="applications"
                  name="Applications"
                  stroke={CHART_COLORS.applications}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="networking"
                  name="Networking"
                  stroke={CHART_COLORS.networking}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="learning"
                  name="Learning Hours"
                  stroke={CHART_COLORS.learning}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="project"
                  name="Project Hours"
                  stroke={CHART_COLORS.project}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="aiExploration"
                  name="AI Exploration"
                  stroke={CHART_COLORS.aiExploration}
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="4 2"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── Recent Scores Table ───────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Scores</CardTitle>
          <CardDescription>Last 8 weeks at a glance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Week</th>
                  <th className="pb-2 pr-4 font-medium">Apps</th>
                  <th className="pb-2 pr-4 font-medium">Networking</th>
                  <th className="pb-2 pr-4 font-medium">Learning</th>
                  <th className="pb-2 pr-4 font-medium">Project</th>
                  <th className="pb-2 pr-4 font-medium">AI</th>
                  <th className="pb-2 font-medium">Leadership</th>
                </tr>
              </thead>
              <tbody>
                {recentScores.map((s) => (
                  <tr
                    key={s.weekStart}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="py-2.5 pr-4 font-medium">
                      {format(parseISO(s.weekStart), "MMM d")}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">
                      {s.applicationsSubmitted ?? 0}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">
                      {s.networkingConversations ?? 0}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">
                      {s.learningHours?.toFixed(1) ?? "0"}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">
                      {s.showcaseProjectHours?.toFixed(1) ?? "0"}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">
                      {s.aiExplorationHours?.toFixed(1) ?? "0"}
                    </td>
                    <td className="py-2.5">
                      {s.leadershipImproved ? (
                        <Badge
                          variant="outline"
                          className="border-primary/30 bg-primary/10 text-primary"
                        >
                          Yes
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </PageScroll>
  );
}

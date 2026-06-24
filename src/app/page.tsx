"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { format, addDays, isPast, isToday, startOfDay, parseISO } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/dashboard/header";
import { PageScroll } from "@/components/ui/page-scroll";
import { TopOutcomes } from "@/components/dashboard/top-outcomes";
import { DeepWorkBlock } from "@/components/dashboard/deep-work-block";
import { EveningBlock } from "@/components/dashboard/evening-block";
import { ProtectionGate } from "@/components/dashboard/protection-gate";
import { TimeSummary } from "@/components/dashboard/time-summary";
import {
  getDailyLog,
  upsertDailyLog,
  updateOutcomeCompletion,
  getSkillSessionsForDate,
  logSkillSession,
  logProtection,
} from "@/lib/actions/daily";
import {
  getTimeLogsForDate,
} from "@/lib/actions/weekly";
import {
  getDeepWorkActivities,
  addDeepWorkActivity,
} from "@/lib/actions/deep-work";
import { reorderOutcomes } from "@/lib/actions/daily";

interface DailyLog {
  id?: number;
  date: string;
  outcome1: string | null;
  outcome2: string | null;
  outcome3: string | null;
  deepWorkTopic: string | null;
  deepWorkCompleted: boolean | number | null;
  deepWorkDuration: number | null;
  eveningTaskType: string | null;
  eveningCompleted: boolean | number | null;
  notes: string | null;
}

interface SkillSessionRow {
  id: number;
  date: string;
  skill: string;
  durationMinutes: number;
  completed: boolean | number;
  notes: string | null;
}

interface TimeLogRow {
  id?: number;
  date: string;
  category: string;
  hours: number;
  description: string | null;
}

function parseOutcome(
  text: string | null,
): { clean: string; completed: boolean } {
  if (!text) return { clean: "", completed: false };
  if (text.startsWith("[x] ")) return { clean: text.slice(4), completed: true };
  return { clean: text, completed: false };
}

export default function DashboardPage() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [dateStr, setDateStr] = useState(() => format(today, "yyyy-MM-dd"));
  const currentDate = parseISO(dateStr);

  const goNextDay = useCallback(() => {
    setDateStr((prev) => format(addDays(parseISO(prev), 1), "yyyy-MM-dd"));
  }, []);

  const goPrevDay = useCallback(() => {
    setDateStr((prev) => format(addDays(parseISO(prev), -1), "yyyy-MM-dd"));
  }, []);

  const isTodayView = isToday(currentDate);
  const canGoNext = !isTodayView;

  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [skillSessions, setSkillSessions] = useState<SkillSessionRow[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLogRow[]>([]);
  const [activities, setActivities] = useState<{ id: number; name: string; icon: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [log, sessions, logs, acts] = await Promise.all([
        getDailyLog(dateStr),
        getSkillSessionsForDate(dateStr),
        getTimeLogsForDate(dateStr),
        getDeepWorkActivities(),
      ]);
      setDailyLog(log as DailyLog | null);
      setSkillSessions(sessions as SkillSessionRow[]);
      setTimeLogs(logs as TimeLogRow[]);
      setActivities(acts as { id: number; name: string; icon: string }[]);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  }, [dateStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const outcomes = [
    parseOutcome(dailyLog?.outcome1 ?? null),
    parseOutcome(dailyLog?.outcome2 ?? null),
    parseOutcome(dailyLog?.outcome3 ?? null),
  ];

  const handleOutcomeSave = useCallback(
    async (index: number, text: string) => {
      const field = `outcome${index + 1}` as
        | "outcome1"
        | "outcome2"
        | "outcome3";
      await upsertDailyLog({ date: dateStr, [field]: text });
      await loadData();
    },
    [dateStr, loadData],
  );

  const handleOutcomeReorder = useCallback(
    async (newOrder: { text: string; completed: boolean }[]) => {
      await reorderOutcomes({
        date: dateStr,
        outcomeValues: [newOrder[0].text, newOrder[1].text, newOrder[2].text],
        completed: [newOrder[0].completed, newOrder[1].completed, newOrder[2].completed],
      });
      await loadData();
    },
    [dateStr, loadData],
  );

  const handleOutcomeToggle = useCallback(
    async (index: number, completed: boolean) => {
      const outcomeIndex = index + 1;
      const result = await updateOutcomeCompletion({
        date: dateStr,
        outcomeIndex,
        completed,
      });
      if (!result.success) {
        await upsertDailyLog({ date: dateStr });
        await updateOutcomeCompletion({
          date: dateStr,
          outcomeIndex,
          completed,
        });
      }
      await loadData();
    },
    [dateStr, loadData],
  );

  const handleLogSession = useCallback(
    async (params: {
      skill: string;
      durationMinutes: number;
      notes?: string;
    }) => {
      await logSkillSession({
        date: dateStr,
        skill: params.skill,
        durationMinutes: params.durationMinutes,
        notes: params.notes,
      });
      await loadData();
    },
    [dateStr, loadData],
  );

  const handleEveningSave = useCallback(
    async (taskType: string | null, completed: boolean) => {
      await upsertDailyLog({
        date: dateStr,
        eveningTaskType: taskType ?? undefined,
        eveningCompleted: completed,
      });
      await loadData();
    },
    [dateStr, loadData],
  );

  const handleProtectionLog = useCallback(
    async (requestDescription: string, actionTaken: string) => {
      await logProtection({
        date: dateStr,
        requestDescription,
        actionTaken,
      });
      await loadData();
    },
    [dateStr, loadData],
  );

  const handleAddActivity = useCallback(
    async (name: string) => {
      await addDeepWorkActivity({ name });
      await loadData();
    },
    [loadData],
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-6">
        <div className="h-16 animate-pulse rounded-lg bg-muted" />
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <PageScroll
      header={
        <Header
          date={currentDate}
          onPrevDay={goPrevDay}
          onNextDay={goNextDay}
          canGoNext={canGoNext}
        />
      }
      maxWidth="max-w-2xl"
      scrollContentClass="space-y-6 pt-6"
    >
      <Separator />

      <TopOutcomes
        outcomes={[
          outcomes[0].clean,
          outcomes[1].clean,
          outcomes[2].clean,
        ]}
        completed={[
          outcomes[0].completed,
          outcomes[1].completed,
          outcomes[2].completed,
        ]}
        onSave={handleOutcomeSave}
        onToggle={handleOutcomeToggle}
        onReorder={handleOutcomeReorder}
      />

      <DeepWorkBlock
        activities={activities}
        sessions={skillSessions}
        onLogSession={handleLogSession}
        onAddActivity={handleAddActivity}
      />

      <EveningBlock
        initialValue={dailyLog?.eveningTaskType ?? null}
        initialCompleted={dailyLog?.eveningCompleted === true}
        onSave={handleEveningSave}
      />

      <ProtectionGate onLog={handleProtectionLog} />

      <TimeSummary timeLogs={timeLogs} />
    </PageScroll>
  );
}

"use server";

import { eq, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  dailyLogs,
  skillSessions,
  protectionLogs,
  timeLogs,
} from "@/lib/db/schema";

interface LogRow {
  id: number;
  date: string;
  outcome1: string | null;
  outcome2: string | null;
  outcome3: string | null;
  deepWorkTopic: string | null;
  deepWorkCompleted: boolean | null;
  deepWorkDuration: number | null;
  eveningTaskType: string | null;
  eveningCompleted: boolean | null;
  notes: string | null;
  createdAt: string | null;
}

interface SkillRow {
  id: number;
  date: string;
  skill: string;
  durationMinutes: number;
  completed: boolean | null;
  notes: string | null;
  createdAt: string | null;
}

interface ProtectionRow {
  id: number;
  date: string;
  requestDescription: string;
  actionTaken: string;
  createdAt: string | null;
}

interface TimeRow {
  id: number;
  date: string;
  category: string;
  hours: number;
  description: string | null;
  createdAt: string | null;
}

export interface DaySummary {
  log: LogRow;
  skillSessions: SkillRow[];
  protectionLogs: ProtectionRow[];
  timeLogs: TimeRow[];
}

export async function getAllPastDays(limit = 90): Promise<DaySummary[]> {
  const allLogs = await db
    .select()
    .from(dailyLogs)
    .orderBy(desc(dailyLogs.date))
    .limit(limit);

  if (allLogs.length === 0) return [];

  const dates = allLogs.map((l) => l.date);

  const [skillRows, protectionRows, timeRows] = await Promise.all([
    db
      .select()
      .from(skillSessions)
      .where(sql`${skillSessions.date} IN ${dates}`),
    db
      .select()
      .from(protectionLogs)
      .where(sql`${protectionLogs.date} IN ${dates}`),
    db
      .select()
      .from(timeLogs)
      .where(sql`${timeLogs.date} IN ${dates}`),
  ]);

  const skillByDate = groupBy(skillRows, "date");
  const protectionByDate = groupBy(protectionRows, "date");
  const timeByDate = groupBy(timeRows, "date");

  return allLogs.map((log) => ({
    log,
    skillSessions: skillByDate[log.date] ?? [],
    protectionLogs: protectionByDate[log.date] ?? [],
    timeLogs: timeByDate[log.date] ?? [],
  }));
}

export async function getDaySummary(date: string): Promise<DaySummary | null> {
  const [log] = await db
    .select()
    .from(dailyLogs)
    .where(eq(dailyLogs.date, date))
    .limit(1);
  if (!log) return null;

  const [skills, protections, times] = await Promise.all([
    db
      .select()
      .from(skillSessions)
      .where(eq(skillSessions.date, date)),
    db
      .select()
      .from(protectionLogs)
      .where(eq(protectionLogs.date, date)),
    db
      .select()
      .from(timeLogs)
      .where(eq(timeLogs.date, date)),
  ]);

  return {
    log,
    skillSessions: skills,
    protectionLogs: protections,
    timeLogs: times,
  };
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function groupBy<T extends Record<string, unknown>>(
  rows: T[],
  key: keyof T,
): Record<string, T[]> {
  const map: Record<string, T[]> = {};
  for (const row of rows) {
    const k = String(row[key]);
    if (!map[k]) map[k] = [];
    map[k].push(row);
  }
  return map;
}

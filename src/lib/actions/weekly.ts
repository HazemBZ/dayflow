"use server";

import { eq, and, sql, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { weeklyPlans, weeklyScores, timeLogs } from "@/lib/db/schema";
import { revalidatePath } from "next/cache";

// ─── Weekly Plan ──────────────────────────────────────────────────────────

export async function getWeeklyPlan(weekStart: string) {
  const rows = await db
    .select()
    .from(weeklyPlans)
    .where(eq(weeklyPlans.weekStart, weekStart))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertWeeklyPlan(params: {
  weekStart: string;
  appsTarget?: number;
  networkingTarget?: number;
  learningHoursTarget?: number;
  projectHoursTarget?: number;
  aiExplorationHoursTarget?: number;
  terraformHours?: number;
  awsHours?: number;
  k8sHours?: number;
  leadershipImprovement?: string;
  leadershipCompleted?: boolean;
  notes?: string;
}) {
  const existing = await getWeeklyPlan(params.weekStart);
  if (existing) {
    await db.update(weeklyPlans).set(params).where(eq(weeklyPlans.weekStart, params.weekStart));
  } else {
    await db.insert(weeklyPlans).values(params as any);
  }
  revalidatePath("/weekly");
  return { success: true };
}

// ─── Weekly Score ─────────────────────────────────────────────────────────

export async function getWeeklyScore(weekStart: string) {
  const rows = await db
    .select()
    .from(weeklyScores)
    .where(eq(weeklyScores.weekStart, weekStart))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertWeeklyScore(params: {
  weekStart: string;
  applicationsSubmitted?: number;
  networkingConversations?: number;
  learningHours?: number;
  showcaseProjectHours?: number;
  leadershipImproved?: boolean;
  aiExplorationHours?: number;
}) {
  const existing = await getWeeklyScore(params.weekStart);
  if (existing) {
    await db.update(weeklyScores).set(params).where(eq(weeklyScores.weekStart, params.weekStart));
  } else {
    await db.insert(weeklyScores).values(params as any);
  }
  revalidatePath("/weekly");
  revalidatePath("/scorecard");
  return { success: true };
}

export async function getAllScores() {
  return await db
    .select()
    .from(weeklyScores)
    .orderBy(asc(weeklyScores.weekStart));
}

// ─── Time Logs ────────────────────────────────────────────────────────────

export async function logTime(params: {
  date: string;
  category: string;
  hours: number;
  description?: string;
}) {
  await db.insert(timeLogs).values(params as any);
  revalidatePath("/budget");
  return { success: true };
}

export async function getTimeLogsForDate(date: string) {
  return await db
    .select()
    .from(timeLogs)
    .where(eq(timeLogs.date, date));
}

export async function getTimeLogsForWeek(weekStart: string) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const endStr = weekEnd.toISOString().slice(0, 10);
  return await db
    .select()
    .from(timeLogs)
    .where(
      and(
        sql`${timeLogs.date} >= ${weekStart}`,
        sql`${timeLogs.date} <= ${endStr}`,
      ),
    );
}

export async function getTimeLogsForRange(start: string, end: string) {
  return await db
    .select()
    .from(timeLogs)
    .where(
      and(
        sql`${timeLogs.date} >= ${start}`,
        sql`${timeLogs.date} <= ${end}`,
      ),
    );
}

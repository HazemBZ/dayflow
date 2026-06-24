"use server";

import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { dailyLogs, skillSessions, protectionLogs } from "@/lib/db/schema";
import { revalidatePath } from "next/cache";

// ─── Daily Log ────────────────────────────────────────────────────────────

export async function getDailyLog(date: string) {
  const rows = await db
    .select()
    .from(dailyLogs)
    .where(eq(dailyLogs.date, date))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertDailyLog(params: {
  date: string;
  outcome1?: string;
  outcome2?: string;
  outcome3?: string;
  deepWorkTopic?: string;
  deepWorkCompleted?: boolean;
  deepWorkDuration?: number;
  eveningTaskType?: string;
  eveningCompleted?: boolean;
  notes?: string;
}) {
  const existing = await getDailyLog(params.date);
  if (existing) {
    await db.update(dailyLogs).set(params).where(eq(dailyLogs.date, params.date));
  } else {
    await db.insert(dailyLogs).values(params as any);
  }
  revalidatePath("/");
  return { success: true };
}

export async function updateOutcomeCompletion(params: {
  date: string;
  outcomeIndex: number; // 1, 2, or 3
  completed: boolean;
}) {
  const field = `outcome${params.outcomeIndex}` as "outcome1" | "outcome2" | "outcome3";
  const existing = await getDailyLog(params.date);
  if (!existing) return { success: false };
  await db
    .update(dailyLogs)
    .set({ [field]: params.completed ? `[x] ${existing[field] ?? ""}` : existing[field]?.replace("[x] ", "") ?? "" })
    .where(eq(dailyLogs.date, params.date));
  revalidatePath("/");
  return { success: true };
}

export async function reorderOutcomes(params: {
  date: string;
  outcomeValues: [string, string, string];
  completed: [boolean, boolean, boolean];
}) {
  const existing = await getDailyLog(params.date);
  if (!existing) return { success: false };

  const encode = (text: string, done: boolean) => (done ? `[x] ${text}` : text);

  await db
    .update(dailyLogs)
    .set({
      outcome1: encode(params.outcomeValues[0], params.completed[0]),
      outcome2: encode(params.outcomeValues[1], params.completed[1]),
      outcome3: encode(params.outcomeValues[2], params.completed[2]),
    })
    .where(eq(dailyLogs.date, params.date));

  revalidatePath("/");
  return { success: true };
}

// ─── Skill Sessions ───────────────────────────────────────────────────────

export async function logSkillSession(params: {
  date: string;
  skill: string;
  durationMinutes: number;
  notes?: string;
}) {
  await db.insert(skillSessions).values(params as any);
  revalidatePath("/");
  revalidatePath("/weekly");
  return { success: true };
}

export async function getSkillSessionsForDate(date: string) {
  return await db
    .select()
    .from(skillSessions)
    .where(eq(skillSessions.date, date));
}

export async function getSkillSessionsForWeek(weekStart: string) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const endStr = weekEnd.toISOString().slice(0, 10);
  return await db
    .select()
    .from(skillSessions)
    .where(
      and(
        sql`${skillSessions.date} >= ${weekStart}`,
        sql`${skillSessions.date} <= ${endStr}`,
      ),
    );
}

// ─── Protection Logs ──────────────────────────────────────────────────────

export async function logProtection(params: {
  date: string;
  requestDescription: string;
  actionTaken: string;
}) {
  await db.insert(protectionLogs).values(params as any);
  revalidatePath("/");
  return { success: true };
}

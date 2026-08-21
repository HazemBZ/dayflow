"use server";

import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { dailyLogs, skillSessions, protectionLogs, outcomeSubtasks, dailyItems, type DailyItemKind } from "@/lib/db/schema";
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
    await db.insert(dailyLogs).values(params as typeof dailyLogs.$inferInsert);
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
  await db.insert(skillSessions).values(params as typeof skillSessions.$inferInsert);
  revalidatePath("/");
  revalidatePath("/weekly");
  return { success: true };
}

export async function updateSkillSession(
  id: number,
  data: { skill?: string; durationMinutes?: number; notes?: string | null },
) {
  await db.update(skillSessions).set(data).where(eq(skillSessions.id, id));
  revalidatePath("/");
  revalidatePath("/weekly");
  revalidatePath("/history");
  return { success: true };
}

export async function deleteSkillSession(id: number) {
  await db.delete(skillSessions).where(eq(skillSessions.id, id));
  revalidatePath("/");
  revalidatePath("/weekly");
  revalidatePath("/history");
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

// ─── Outcome Subtasks ─────────────────────────────────────────────────────

export async function getOutcomeSubtaskCounts(date: string) {
  const rows = await db
    .select({
      outcomeIndex: outcomeSubtasks.outcomeIndex,
      completed: outcomeSubtasks.completed,
    })
    .from(outcomeSubtasks)
    .where(eq(outcomeSubtasks.date, date));

  const counts: Record<number, { done: number; total: number }> = {
    1: { done: 0, total: 0 },
    2: { done: 0, total: 0 },
    3: { done: 0, total: 0 },
  };
  for (const row of rows) {
    counts[row.outcomeIndex].total += 1;
    if (row.completed) counts[row.outcomeIndex].done += 1;
  }
  return counts as Record<1 | 2 | 3, { done: number; total: number }>;
}

export async function getOutcomeSubtasks(date: string, outcomeIndex: number) {
  return await db
    .select()
    .from(outcomeSubtasks)
    .where(
      and(
        eq(outcomeSubtasks.date, date),
        eq(outcomeSubtasks.outcomeIndex, outcomeIndex),
      ),
    )
    .orderBy(outcomeSubtasks.sortOrder);
}

export async function createOutcomeSubtask(params: {
  date: string;
  outcomeIndex: number;
  text: string;
}) {
  const existing = await db
    .select({ maxSort: outcomeSubtasks.sortOrder })
    .from(outcomeSubtasks)
    .where(
      and(
        eq(outcomeSubtasks.date, params.date),
        eq(outcomeSubtasks.outcomeIndex, params.outcomeIndex),
      ),
    )
    .orderBy(outcomeSubtasks.sortOrder)
    .limit(1);

  const nextSort = (existing[0]?.maxSort ?? -1) + 1;

  await db.insert(outcomeSubtasks).values({
    date: params.date,
    outcomeIndex: params.outcomeIndex,
    text: params.text,
    sortOrder: nextSort,
  });
  revalidatePath("/");
  return { success: true };
}

export async function updateOutcomeSubtask(
  id: number,
  data: { text?: string; completed?: boolean },
) {
  await db.update(outcomeSubtasks).set(data).where(eq(outcomeSubtasks.id, id));
  revalidatePath("/");
  return { success: true };
}

export async function deleteOutcomeSubtask(id: number) {
  await db.delete(outcomeSubtasks).where(eq(outcomeSubtasks.id, id));
  revalidatePath("/");
  return { success: true };
}

// ─── Daily Items (Chores & Extras) ────────────────────────────────────────

export async function getDailyItems(date: string, kind: DailyItemKind) {
  return await db
    .select()
    .from(dailyItems)
    .where(and(eq(dailyItems.date, date), eq(dailyItems.kind, kind)))
    .orderBy(dailyItems.sortOrder);
}

export async function createDailyItem(params: {
  date: string;
  kind: DailyItemKind;
  text: string;
}) {
  const existing = await db
    .select({ maxSort: dailyItems.sortOrder })
    .from(dailyItems)
    .where(
      and(
        eq(dailyItems.date, params.date),
        eq(dailyItems.kind, params.kind),
      ),
    )
    .orderBy(dailyItems.sortOrder)
    .limit(1);

  const nextSort = (existing[0]?.maxSort ?? -1) + 1;

  await db.insert(dailyItems).values({
    date: params.date,
    kind: params.kind,
    text: params.text,
    sortOrder: nextSort,
  });
  revalidatePath("/");
  return { success: true };
}

export async function updateDailyItem(
  id: number,
  data: { text?: string; completed?: boolean },
) {
  await db.update(dailyItems).set(data).where(eq(dailyItems.id, id));
  revalidatePath("/");
  return { success: true };
}

export async function deleteDailyItem(id: number) {
  await db.delete(dailyItems).where(eq(dailyItems.id, id));
  revalidatePath("/");
  return { success: true };
}

// ─── Protection Logs ──────────────────────────────────────────────────────

export async function logProtection(params: {
  date: string;
  requestDescription: string;
  actionTaken: string;
}) {
  await db.insert(protectionLogs).values(params as typeof protectionLogs.$inferInsert);
  revalidatePath("/");
  return { success: true };
}

"use server";

import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { bugNotes } from "@/lib/db/schema";
import { revalidatePath } from "next/cache";

export type BugNoteRow = {
  id: string;
  text: string;
  createdAt: number;
  updatedAt: number;
  bookmarked: boolean;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "in-progress" | "resolved" | "closed";
};

export async function getBugNotes(): Promise<BugNoteRow[]> {
  const rows = await db
    .select()
    .from(bugNotes)
    .orderBy(desc(bugNotes.createdAt));
  return rows.map((r) => ({
    ...r,
    bookmarked: r.bookmarked ?? false,
    severity: r.severity ?? "medium",
    status: r.status ?? "open",
  }));
}

export async function addBugNote(text: string): Promise<BugNoteRow> {
  const now = Date.now();
  const id = `bug_${now}_${Math.random().toString(36).slice(2, 8)}`;
  const note: BugNoteRow = {
    id,
    text,
    createdAt: now,
    updatedAt: now,
    bookmarked: false,
    severity: "medium",
    status: "open",
  };
  await db.insert(bugNotes).values(note);
  revalidatePath("/");
  return note;
}

export async function getBugNote(id: string): Promise<BugNoteRow | null> {
  const rows = await db
    .select()
    .from(bugNotes)
    .where(eq(bugNotes.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    bookmarked: row.bookmarked ?? false,
    severity: row.severity ?? "medium",
    status: row.status ?? "open",
  };
}

export async function removeBugNote(id: string) {
  await db.delete(bugNotes).where(eq(bugNotes.id, id));
  revalidatePath("/");
}

export async function updateBugNote(id: string, text: string) {
  await db
    .update(bugNotes)
    .set({ text, updatedAt: Date.now() })
    .where(eq(bugNotes.id, id));
  revalidatePath("/");
}

export async function updateBugNoteStatus(
  id: string,
  status: BugNoteRow["status"],
): Promise<BugNoteRow> {
  const rows = await db
    .select()
    .from(bugNotes)
    .where(eq(bugNotes.id, id))
    .limit(1);
  const note = rows[0];
  if (!note) throw new Error("Bug note not found");
  await db
    .update(bugNotes)
    .set({ status, updatedAt: Date.now() })
    .where(eq(bugNotes.id, id));
  revalidatePath("/");
  return {
    ...note,
    bookmarked: note.bookmarked ?? false,
    severity: note.severity as BugNoteRow["severity"],
    status,
  };
}

export async function toggleBugNoteBookmark(id: string): Promise<BugNoteRow> {
  const rows = await db
    .select()
    .from(bugNotes)
    .where(eq(bugNotes.id, id))
    .limit(1);
  const note = rows[0];
  if (!note) throw new Error("Bug note not found");
  const next = !(note.bookmarked ?? false);
  await db
    .update(bugNotes)
    .set({ bookmarked: next, updatedAt: Date.now() })
    .where(eq(bugNotes.id, id));
  revalidatePath("/");
  return {
    ...note,
    bookmarked: next,
    severity: note.severity ?? "medium",
    status: note.status ?? "open",
  };
}

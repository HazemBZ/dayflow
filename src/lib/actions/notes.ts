"use server";

import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { quickNotes } from "@/lib/db/schema";
import { revalidatePath } from "next/cache";

export type NoteRow = {
  id: string;
  text: string;
  createdAt: number;
  updatedAt: number;
  bookmarked: boolean;
};

export async function getNotes(): Promise<NoteRow[]> {
  const rows = await db
    .select()
    .from(quickNotes)
    .orderBy(desc(quickNotes.createdAt));
  return rows.map((r) => ({ ...r, bookmarked: r.bookmarked ?? false }));
}

export async function addNote(text: string): Promise<NoteRow> {
  const now = Date.now();
  const id = `note_${now}_${Math.random().toString(36).slice(2, 8)}`;
  const note: NoteRow = { id, text, createdAt: now, updatedAt: now, bookmarked: false };
  await db.insert(quickNotes).values(note);
  revalidatePath("/");
  return note;
}

export async function getNote(id: string): Promise<NoteRow | null> {
  const rows = await db
    .select()
    .from(quickNotes)
    .where(eq(quickNotes.id, id))
    .limit(1);
  const row = rows[0];
  return row ? { ...row, bookmarked: row.bookmarked ?? false } : null;
}

export async function removeNote(id: string) {
  await db.delete(quickNotes).where(eq(quickNotes.id, id));
  revalidatePath("/");
}

export async function updateNote(id: string, text: string) {
  await db
    .update(quickNotes)
    .set({ text, updatedAt: Date.now() })
    .where(eq(quickNotes.id, id));
  revalidatePath("/");
}

export async function toggleBookmark(id: string): Promise<NoteRow> {
  const rows = await db
    .select()
    .from(quickNotes)
    .where(eq(quickNotes.id, id))
    .limit(1);
  const note = rows[0];
  if (!note) throw new Error("Note not found");
  const next = !(note.bookmarked ?? false);
  await db
    .update(quickNotes)
    .set({ bookmarked: next, updatedAt: Date.now() })
    .where(eq(quickNotes.id, id));
  revalidatePath("/");
  return { ...note, bookmarked: next };
}

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
  archived: boolean;
  tags: string[];
};

function parseTags(raw: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(raw ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatNote(r: typeof quickNotes.$inferSelect): NoteRow {
  return {
    id: r.id,
    text: r.text,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    bookmarked: r.bookmarked ?? false,
    archived: r.archived ?? false,
    tags: parseTags(r.tags),
  };
}

export async function getNotes(includeArchived = false): Promise<NoteRow[]> {
  const rows = await db
    .select()
    .from(quickNotes)
    .orderBy(desc(quickNotes.createdAt));
  return rows
    .map(formatNote)
    .filter((r) => includeArchived || !r.archived);
}

export async function addNote(text: string, tags: string[] = []): Promise<NoteRow> {
  const now = Date.now();
  const id = `note_${now}_${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(quickNotes).values({ id, text, tags: JSON.stringify(tags), createdAt: now, updatedAt: now, bookmarked: false, archived: false });
  revalidatePath("/");
  return { id, text, createdAt: now, updatedAt: now, bookmarked: false, archived: false, tags };
}

export async function getNote(id: string): Promise<NoteRow | null> {
  const rows = await db
    .select()
    .from(quickNotes)
    .where(eq(quickNotes.id, id))
    .limit(1);
  const row = rows[0];
  return row ? formatNote(row) : null;
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
  return { ...formatNote(note), bookmarked: next };
}

export async function toggleArchive(id: string): Promise<NoteRow> {
  const rows = await db
    .select()
    .from(quickNotes)
    .where(eq(quickNotes.id, id))
    .limit(1);
  const note = rows[0];
  if (!note) throw new Error("Note not found");
  const next = !(note.archived ?? false);
  await db
    .update(quickNotes)
    .set({ archived: next, updatedAt: Date.now() })
    .where(eq(quickNotes.id, id));
  revalidatePath("/");
  return { ...formatNote(note), archived: next };
}

export async function setNoteTags(id: string, tags: string[]): Promise<NoteRow> {
  const rows = await db
    .select()
    .from(quickNotes)
    .where(eq(quickNotes.id, id))
    .limit(1);
  const note = rows[0];
  if (!note) throw new Error("Note not found");
  const clean = [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
  await db
    .update(quickNotes)
    .set({ tags: JSON.stringify(clean), updatedAt: Date.now() })
    .where(eq(quickNotes.id, id));
  revalidatePath("/");
  return { ...formatNote(note), tags: clean };
}

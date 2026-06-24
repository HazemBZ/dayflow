"use server";

import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { deepWorkActivities } from "@/lib/db/schema";
import { revalidatePath } from "next/cache";

export async function getDeepWorkActivities() {
  return await db
    .select()
    .from(deepWorkActivities)
    .orderBy(asc(deepWorkActivities.sortOrder));
}

export async function addDeepWorkActivity(params: {
  name: string;
  icon?: string;
  sortOrder?: number;
}) {
  const maxOrder = await db
    .select({ max: deepWorkActivities.sortOrder })
    .from(deepWorkActivities)
    .orderBy(asc(deepWorkActivities.sortOrder))
    .limit(1);

  const nextOrder = (maxOrder[0]?.max ?? -1) + 1;
  await db.insert(deepWorkActivities).values({
    name: params.name,
    icon: params.icon ?? "book-open",
    sortOrder: params.sortOrder ?? nextOrder,
  });
  revalidatePath("/");
  return { success: true };
}

export async function deleteDeepWorkActivity(id: number) {
  await db.delete(deepWorkActivities).where(eq(deepWorkActivities.id, id));
  revalidatePath("/");
  revalidatePath("/settings");
  return { success: true };
}

export async function reorderDeepWorkActivities(ids: number[]) {
  for (let i = 0; i < ids.length; i++) {
    await db
      .update(deepWorkActivities)
      .set({ sortOrder: i })
      .where(eq(deepWorkActivities.id, ids[i]));
  }
  revalidatePath("/");
  revalidatePath("/settings");
  return { success: true };
}

"use server";

import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { fieldConfig } from "@/lib/db/schema";
import { revalidatePath } from "next/cache";

export type FieldConfigRow = Awaited<ReturnType<typeof getFieldConfigs>>[number];

export async function getFieldConfigs(section?: string) {
  const query = db
    .select()
    .from(fieldConfig)
    .orderBy(asc(fieldConfig.sort_order), asc(fieldConfig.id));
  if (section) {
    return await query.where(eq(fieldConfig.section, section));
  }
  return await query;
}

export async function upsertFieldConfig(params: {
  id?: number;
  section: string;
  key: string;
  label: string;
  unit?: string | null;
  color?: string | null;
  default_value?: number | null;
  max_value?: number | null;
  sort_order?: number;
  active?: boolean;
}) {
  if (params.id) {
    await db
      .update(fieldConfig)
      .set({
        label: params.label,
        unit: params.unit ?? null,
        color: params.color ?? null,
        default_value: params.default_value ?? null,
        max_value: params.max_value ?? null,
        sort_order: params.sort_order ?? 0,
        active: params.active ?? true,
      })
      .where(eq(fieldConfig.id, params.id));
  } else {
    const maxOrder = await db
      .select({ max: fieldConfig.sort_order })
      .from(fieldConfig)
      .where(eq(fieldConfig.section, params.section))
      .orderBy(asc(fieldConfig.sort_order))
      .limit(1);
    const nextOrder = (maxOrder[0]?.max ?? -1) + 1;

    await db.insert(fieldConfig).values({
      section: params.section,
      key: params.key,
      label: params.label,
      unit: params.unit ?? null,
      color: params.color ?? null,
      default_value: params.default_value ?? null,
      max_value: params.max_value ?? null,
      sort_order: params.sort_order ?? nextOrder,
      active: params.active ?? true,
    });
  }
  revalidatePath("/settings");
  revalidatePath("/weekly");
  revalidatePath("/scorecard");
  return { success: true };
}

export async function deleteFieldConfig(id: number) {
  await db.delete(fieldConfig).where(eq(fieldConfig.id, id));
  revalidatePath("/settings");
  revalidatePath("/weekly");
  revalidatePath("/scorecard");
  return { success: true };
}

export async function toggleFieldConfig(id: number, active: boolean) {
  await db
    .update(fieldConfig)
    .set({ active })
    .where(eq(fieldConfig.id, id));
  revalidatePath("/settings");
  revalidatePath("/weekly");
  revalidatePath("/scorecard");
  return { success: true };
}

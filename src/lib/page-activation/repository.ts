import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { pageActivations } from "@/lib/db/schema";
import {
  PAGE_ACTIVATION_REGISTRY,
  type PageActivationConfig,
  type PageActivationRoute,
} from "@/lib/page-activation/registry";

export type PageActivationState = PageActivationConfig & {
  readonly active: boolean;
};

export async function getPageActivationStates(): Promise<
  readonly PageActivationState[]
> {
  const rows = await db.select().from(pageActivations);

  return PAGE_ACTIVATION_REGISTRY.map((page) => {
    const row = rows.find((candidate) => candidate.route === page.route);
    return { ...page, active: row?.active ?? true };
  });
}

export async function getPageActivation(
  route: PageActivationRoute,
): Promise<boolean> {
  const rows = await db
    .select({ active: pageActivations.active })
    .from(pageActivations)
    .where(eq(pageActivations.route, route))
    .limit(1);

  return rows[0]?.active ?? true;
}

export async function setPageActivation(
  route: PageActivationRoute,
  active: boolean,
): Promise<void> {
  await db
    .insert(pageActivations)
    .values({ route, active })
    .onConflictDoUpdate({
      target: pageActivations.route,
      set: { active },
    });
}

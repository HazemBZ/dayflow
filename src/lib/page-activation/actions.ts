"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { updatePageActivationSchema } from "@/lib/page-activation/contracts";
import {
  isPageActivationRoute,
  PAGE_ACTIVATION_REGISTRY,
} from "@/lib/page-activation/registry";
import { setPageActivation } from "@/lib/page-activation/repository";

class PageActivationInputError extends Error {
  readonly route: string;

  constructor(route: string) {
    super(`Route is not configurable for page activation: ${route}`);
    this.name = "PageActivationInputError";
    this.route = route;
  }
}

export async function updatePageActivation(input: unknown): Promise<void> {
  const { route, active } = updatePageActivationSchema.parse(input);
  if (!isPageActivationRoute(route)) {
    throw new PageActivationInputError(route);
  }

  await setPageActivation(route, active);
  revalidatePath("/");
  revalidatePath("/settings");
  for (const page of PAGE_ACTIVATION_REGISTRY) {
    revalidatePath(page.route);
  }
}

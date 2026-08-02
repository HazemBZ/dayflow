import "server-only";

import { redirect } from "next/navigation";

import { getPageActivation } from "@/lib/page-activation/repository";
import type { PageActivationRoute } from "@/lib/page-activation/registry";

export async function guardPageActivation(
  route: PageActivationRoute,
): Promise<void> {
  if (await getPageActivation(route)) {
    return;
  }
  redirect("/settings");
}

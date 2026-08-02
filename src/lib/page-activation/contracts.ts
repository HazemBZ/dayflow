import { z } from "zod";

import { isPageActivationRoute } from "@/lib/page-activation/registry";

export const updatePageActivationSchema = z.object({
  route: z.string().refine(isPageActivationRoute, {
    message: "Route is not configurable for page activation",
  }),
  active: z.boolean(),
});

import type { ReactNode } from "react";

import { guardPageActivation } from "@/lib/page-activation/guard";

export const dynamic = "force-dynamic";

export default async function CanvasLayout({
  children,
}: Readonly<{ children: ReactNode }>): Promise<ReactNode> {
  await guardPageActivation("/canvas");
  return children;
}

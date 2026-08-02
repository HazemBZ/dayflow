"use client";

import { useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarContent } from "@/components/ui/sidebar-content";
import { viewModeStore } from "@/lib/view-mode-store";
import type { PageActivationRoute } from "@/lib/page-activation/registry";

export type PageActivationState = {
  readonly route: PageActivationRoute;
  readonly label: string;
  readonly active: boolean;
};

type SidebarProps = {
  readonly pageActivationStates: readonly PageActivationState[];
};

export function Sidebar({ pageActivationStates }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const viewMode = useSyncExternalStore(viewModeStore.subscribe, viewModeStore.getSnapshot, viewModeStore.getServerSnapshot);
  return (
    <>
      <motion.aside
        animate={{ width: viewMode === "simple" ? 64 : 224 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="hidden overflow-y-auto border-r bg-background md:block"
      >
        <SidebarContent pageActivationStates={pageActivationStates} />
      </motion.aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="ghost" size="icon" className="fixed left-4 top-3 z-50 md:hidden" />}>
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-56 p-0">
          <SidebarContent pageActivationStates={pageActivationStates} />
        </SheetContent>
      </Sheet>
    </>
  );
}

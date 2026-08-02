"use client";

import { Eye } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { SidebarNavigation } from "@/components/ui/sidebar-navigation";
import { SidebarPreferences } from "@/components/ui/sidebar-preferences";
import { cn } from "@/lib/utils";
import { viewModeStore } from "@/lib/view-mode-store";
import type { PageActivationState } from "@/components/ui/sidebar";

type ViewMode = "simple" | "full";

type SidebarContentProps = {
  readonly pageActivationStates: readonly PageActivationState[];
};

export function SidebarContent({ pageActivationStates }: SidebarContentProps) {
  const pathname = usePathname();
  const viewMode = useSyncExternalStore(viewModeStore.subscribe, viewModeStore.getSnapshot, viewModeStore.getServerSnapshot);

  return (
    <div className="flex h-full flex-col gap-2 py-4">
      <SidebarHeader viewMode={viewMode} />
      <SidebarNavigation pathname={pathname} viewMode={viewMode} pageActivationStates={pageActivationStates} />
      {viewMode === "full" && <SidebarPreferences />}
      {viewMode === "full" && <div className="mt-auto px-4"><p className="whitespace-nowrap text-[10px] text-muted-foreground">Daily → Weekly → Monthly → Quarterly</p></div>}
    </div>
  );
}

type SidebarHeaderProps = {
  readonly viewMode: ViewMode;
};

function SidebarHeader({ viewMode }: SidebarHeaderProps) {
  function toggleViewMode(): void {
    viewModeStore.set(viewMode === "full" ? "simple" : "full");
  }

  return (
    <div className="px-4 pb-6">
      <div className={cn("flex items-center", viewMode === "full" ? "justify-between" : "justify-center")}>
        {viewMode === "full" && <h2 className="text-lg font-semibold tracking-tight">Priorities</h2>}
        <button onClick={toggleViewMode} title={viewMode === "full" ? "Switch to simple view" : "Switch to full view"} className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", viewMode === "full" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
          <Eye className="h-4 w-4" />
        </button>
      </div>
      <p className={cn("mt-1 whitespace-nowrap text-xs text-muted-foreground", viewMode === "simple" && "hidden")}>Planning System</p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarCheck, Clock, History, LayoutDashboard, ListTodo, Map, Settings, StickyNote, Target, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PageActivationState } from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Notes", href: "/notes", icon: StickyNote },
  { title: "Todos", href: "/todos", icon: ListTodo },
  { title: "Weekly", href: "/weekly", icon: CalendarCheck },
  { title: "Scorecard", href: "/scorecard", icon: Target },
  { title: "Horizon", href: "/horizon", icon: Map },
  { title: "Budget", href: "/budget", icon: Clock },
  { title: "History", href: "/history", icon: History },
  { title: "Canvas", href: "/canvas", icon: Workflow },
  { title: "Settings", href: "/settings", icon: Settings },
] as const;

const SIMPLE_MODE_HREFS: readonly string[] = ["/", "/todos", "/history"];

type ViewMode = "simple" | "full";

type SidebarNavigationProps = {
  readonly pathname: string;
  readonly viewMode: ViewMode;
  readonly pageActivationStates: readonly PageActivationState[];
};

export function SidebarNavigation({ pathname, viewMode, pageActivationStates }: SidebarNavigationProps) {
  const activeRoutes = new Set(pageActivationStates.filter((state) => state.active).map((state) => state.route));
  const persistedItems = NAV_ITEMS.filter((item) => item.href === "/" || item.href === "/settings" || activeRoutes.has(item.href));
  const visibleItems = viewMode === "simple" ? persistedItems.filter((item) => SIMPLE_MODE_HREFS.includes(item.href)) : persistedItems;

  return (
    <nav className="flex flex-col gap-1 px-2">
      <AnimatePresence mode="popLayout">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <motion.div key={item.href} initial={{ opacity: 0, scaleY: 0 }} animate={{ opacity: 1, scaleY: 1, transition: { duration: 0.35, ease: "easeOut" } }} exit={{ opacity: 0, scaleY: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }} style={{ originY: 0 }}>
              <Link href={item.href} className={cn("relative flex items-center rounded-lg py-2 text-sm font-medium transition-colors", viewMode === "simple" ? "justify-center px-2" : "gap-3 px-3", isActive ? "text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                {isActive && <motion.div layoutId="active-nav" className="absolute inset-0 rounded-lg bg-primary" transition={{ duration: 0.25, ease: "easeInOut" }} />}
                <span className="relative z-10 flex items-center gap-3"><Icon className="h-4 w-4 shrink-0" /><span className={cn(viewMode === "simple" && "hidden")}>{item.title}</span></span>
              </Link>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </nav>
  );
}

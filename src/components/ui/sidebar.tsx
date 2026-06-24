"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  Target,
  Map,
  Clock,
  History,
  Settings,
  Menu,
  X,
  Palette,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/lib/theme/theme-provider";
import { THEMES, type ThemeClass } from "@/lib/theme/theme-config";
import { FONT_OPTIONS, type FontId } from "@/lib/fonts/font-config";
import { viewModeStore } from "@/lib/view-mode-store";

const NAV_ITEMS = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Weekly", href: "/weekly", icon: CalendarCheck },
  { title: "Scorecard", href: "/scorecard", icon: Target },
  { title: "Horizon", href: "/horizon", icon: Map },
  { title: "Budget", href: "/budget", icon: Clock },
  { title: "History", href: "/history", icon: History },
  { title: "Settings", href: "/settings", icon: Settings },
];

type ViewMode = "simple" | "full";

const VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: "simple", label: "Simple" },
  { id: "full", label: "Full" },
];

const SIMPLE_MODE_HREFS = ["/", "/history"];

const itemVariants = {
  enter: {
    opacity: 1,
    y: 0,
    scaleY: 1,
    transition: { type: "spring", stiffness: 350, damping: 35, mass: 0.8 },
  },
  exit: {
    opacity: 0,
    y: -10,
    scaleY: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  },
};

function SidebarContent() {
  const pathname = usePathname();
  const { theme: activeTheme, setTheme, font: activeFont, setFont } = useTheme();
  const viewMode = useSyncExternalStore(
    viewModeStore.subscribe,
    viewModeStore.getSnapshot,
    viewModeStore.getServerSnapshot,
  );

  const setViewMode = (mode: ViewMode) => {
    viewModeStore.set(mode);
  };

  const visibleItems = viewMode === "simple"
    ? NAV_ITEMS.filter((item) => SIMPLE_MODE_HREFS.includes(item.href))
    : NAV_ITEMS;

  return (
    <div className="flex h-full flex-col gap-2 py-4">
      <div className="px-4 pb-6">
        <h2 className="text-lg font-semibold tracking-tight">Priorities</h2>
        <p className="text-xs text-muted-foreground">Planning System</p>
      </div>
      <nav className="flex flex-col gap-1 px-2">
        <AnimatePresence mode="popLayout">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <motion.div
                key={item.href}
                variants={itemVariants}
                initial="exit"
                animate="enter"
                exit="exit"
                layout
                style={{ originY: 0 }}
              >
                <Link
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-nav"
                      className="absolute inset-0 rounded-lg bg-primary"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    {item.title}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </nav>

      {/* View mode toggle */}
      <div className="mt-2 px-4">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <Eye className="h-3 w-3" />
          View
        </div>
        <div className="flex gap-1">
          {VIEW_MODES.map((mode) => {
            const active = viewMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id)}
                className={cn(
                  "flex-1 rounded-md px-2 py-1 text-xs transition-all",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      {viewMode === "full" && (
      /* Theme picker */
      <div className="mt-2 px-4">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <Palette className="h-3 w-3" />
          Theme
        </div>
        <div className="flex gap-2">
            {(viewMode === "simple" ? THEMES.filter(t => t.className === activeTheme) : THEMES).map((t) => {
            const active = activeTheme === t.className;
            return (
              <button
                key={t.className}
                onClick={() => setTheme(t.className as ThemeClass)}
                title={t.name}
                className={cn(
                  "h-6 w-6 rounded-full ring-offset-2 ring-offset-background transition-all hover:scale-110",
                  active && "ring-2 ring-foreground scale-110",
                )}
                style={{ backgroundColor: t.swatch }}
              />
            );
          })}
        </div>
      </div>)}

      {viewMode === "full" && (
      /* Font picker */
      <div className="mt-3 px-4">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <span className="font-mono text-[11px]">Aa</span>
          Font
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="flex flex-wrap gap-1">
            {(viewMode === "simple" ? FONT_OPTIONS.filter(f => f.category === "sans" && f.id === activeFont) : FONT_OPTIONS.filter(f => f.category === "sans")).map((f) => {
              const active = activeFont === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFont(f.id as FontId)}
                  title={`${f.name} — ${f.description}`}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs transition-all",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {f.name}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-1">
            {(viewMode === "simple" ? FONT_OPTIONS.filter(f => f.category === "serif" && f.id === activeFont) : FONT_OPTIONS.filter(f => f.category === "serif")).map((f) => {
              const active = activeFont === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFont(f.id as FontId)}
                  title={`${f.name} — ${f.description}`}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs transition-all",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {f.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>)}

      <div className="mt-auto px-4">
        <p className="text-[10px] text-muted-foreground">
          Daily → Weekly → Monthly → Quarterly
        </p>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-56 overflow-y-auto border-r bg-background md:block">
        <SidebarContent />
      </aside>

      {/* Mobile sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="fixed left-4 top-3 z-50 md:hidden"
            />
          }
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-56 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}

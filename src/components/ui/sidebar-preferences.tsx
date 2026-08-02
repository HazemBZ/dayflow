"use client";

import { Palette, ZoomIn } from "lucide-react";
import { useSyncExternalStore, type ReactNode } from "react";
import { useTheme } from "@/lib/theme/theme-provider";
import { FONT_OPTIONS } from "@/lib/fonts/font-config";
import { SCALE_PRESETS, scaleStore } from "@/lib/scale-store";
import { THEMES } from "@/lib/theme/theme-config";
import { cn } from "@/lib/utils";

export function SidebarPreferences() {
  const { theme: activeTheme, setTheme, font: activeFont, setFont } = useTheme();
  const currentScale = useSyncExternalStore(scaleStore.subscribe, scaleStore.getSnapshot, scaleStore.getServerSnapshot);

  return (
    <>
      <div className="mt-2 px-4">
        <PreferenceTitle icon={<Palette className="h-3 w-3" />}>Theme</PreferenceTitle>
        <div className="flex gap-2">
          {THEMES.map((theme) => <button key={theme.className} onClick={() => setTheme(theme.className)} title={theme.name} className={cn("h-6 w-6 rounded-full border border-border ring-offset-2 ring-offset-background transition-all hover:scale-110", activeTheme === theme.className && "scale-110 ring-2 ring-foreground")} style={{ backgroundColor: theme.swatch }} />)}
        </div>
      </div>
      <div className="mt-3 px-4">
        <PreferenceTitle icon={<span className="font-mono text-[11px]">Aa</span>}>Font</PreferenceTitle>
        <div className="flex flex-col gap-0.5">
          <FontOptions category="sans" activeFont={activeFont} onSelect={setFont} />
          <FontOptions category="serif" activeFont={activeFont} onSelect={setFont} />
        </div>
      </div>
      <div className="mt-3 px-4">
        <PreferenceTitle icon={<ZoomIn className="h-3 w-3" />}>Zoom</PreferenceTitle>
        <div className="flex flex-wrap gap-1">
          {SCALE_PRESETS.map((scale) => <button key={scale} onClick={() => scaleStore.set(scale)} className={cn("whitespace-nowrap rounded-md px-2 py-1 text-xs transition-all", currentScale === scale ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>{scale === 1 ? "100%" : `${Math.round(scale * 100)}%`}</button>)}
        </div>
      </div>
    </>
  );
}

type PreferenceTitleProps = { readonly icon: ReactNode; readonly children: string };

function PreferenceTitle({ icon, children }: PreferenceTitleProps) {
  return <div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{icon}{children}</div>;
}

type FontOptionsProps = { readonly category: "sans" | "serif"; readonly activeFont: string; readonly onSelect: (font: string) => void };

function FontOptions({ category, activeFont, onSelect }: FontOptionsProps) {
  return <div className="flex flex-wrap gap-1">{FONT_OPTIONS.filter((font) => font.category === category).map((font) => <button key={font.id} onClick={() => onSelect(font.id)} title={`${font.name} — ${font.description}`} className={cn("whitespace-nowrap rounded-md px-2 py-1 text-xs transition-all", activeFont === font.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>{font.name}</button>)}</div>;
}

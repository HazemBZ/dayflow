"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { THEMES, isValidTheme, type ThemeClass } from "./theme-config";
import {
  FONT_OPTIONS,
  isValidFontId,
  type FontId,
} from "@/lib/fonts/font-config";

interface ThemeContextValue {
  theme: ThemeClass;
  setTheme: (t: ThemeClass) => void;
  font: FontId;
  setFont: (f: FontId) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "theme-default",
  setTheme: () => {},
  font: "geist",
  setFont: () => {},
});

function applyFont(fontId: FontId) {
  const font = FONT_OPTIONS.find((f) => f.id === fontId);
  if (!font) return;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(font.variable)
    .trim();
  if (value) {
    document.documentElement.style.setProperty("--font-sans", value);
  }
  localStorage.setItem("font", fontId);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // SSR-safe defaults — match what server renders. Rehydrate from
  // localStorage after hydration to avoid SSR-vs-client mismatch.
  const [theme, setThemeState] = useState<ThemeClass>("theme-default");
  const [font, setFontState] = useState<FontId>("geist");

  // One post-hydration pass: rehydrate + apply to DOM immediately,
  // avoiding the one-frame flash of two separate effects.
  useEffect(() => {
    const resolvedTheme = isValidTheme(localStorage.getItem("theme"))
      ? (localStorage.getItem("theme") as ThemeClass)
      : "theme-default";
    const savedFont = localStorage.getItem("font");
    const resolvedFont = isValidFontId(savedFont) ? savedFont : "geist";

    // Apply to DOM synchronously (before React paints)
    for (const th of THEMES) {
      document.documentElement.classList.remove(th.className);
    }
    document.documentElement.classList.add(resolvedTheme);
    applyFont(resolvedFont);

    // Sync state (triggers re-render, but DOM already matches)
    setThemeState(resolvedTheme);
    setFontState(resolvedFont as FontId);
  }, []);

  // Keep DOM in sync when user changes theme/font via context
  useEffect(() => {
    for (const th of THEMES) {
      document.documentElement.classList.remove(th.className);
    }
    document.documentElement.classList.add(theme);
    applyFont(font);
  }, [theme, font]);

  const setTheme = (t: ThemeClass) => {
    for (const th of THEMES) {
      document.documentElement.classList.remove(th.className);
    }
    document.documentElement.classList.add(t);
    setThemeState(t);
    localStorage.setItem("theme", t);
  };

  const setFont = (f: FontId) => {
    setFontState(f);
    applyFont(f);
  };

  const value = useMemo(
    () => ({ theme, setTheme, font, setFont }),
    [theme, font],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

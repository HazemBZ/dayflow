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
  const [theme, setThemeState] = useState<ThemeClass>("theme-default");
  const [font, setFontState] = useState<FontId>("geist");

  useEffect(() => {
    // Restore theme
    const savedTheme = localStorage.getItem("theme");
    if (isValidTheme(savedTheme)) {
      setThemeState(savedTheme);
      document.documentElement.classList.add(savedTheme);
    } else {
      document.documentElement.classList.add("theme-default");
    }

    // Restore font
    const savedFont = localStorage.getItem("font");
    if (isValidFontId(savedFont)) {
      setFontState(savedFont);
      applyFont(savedFont);
    }
  }, []);

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

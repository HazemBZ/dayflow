export interface FontOption {
  id: string;
  name: string;
  category: "sans" | "serif";
  description: string;
  variable: string; // CSS variable set by next/font loader
}

export const FONT_OPTIONS: FontOption[] = [
  {
    id: "geist",
    name: "Geist",
    category: "sans",
    description: "Default — clean and modern",
    variable: "--font-geist-sans",
  },
  {
    id: "inter",
    name: "Inter",
    category: "sans",
    description: "Optimized for screen readability",
    variable: "--font-inter",
  },
  {
    id: "atkinson",
    name: "Atkinson Hyperlegible",
    category: "sans",
    description: "Maximum legibility at any size",
    variable: "--font-atkinson",
  },
  {
    id: "lora",
    name: "Lora",
    category: "serif",
    description: "Warm literary serif for body text",
    variable: "--font-lora",
  },
  {
    id: "merriweather",
    name: "Merriweather",
    category: "serif",
    description: "Built for long-form screen reading",
    variable: "--font-merriweather",
  },
];

export type FontId = (typeof FONT_OPTIONS)[number]["id"];

export function isValidFontId(id: string | null): id is FontId {
  if (!id) return false;
  return FONT_OPTIONS.some((f) => f.id === id);
}

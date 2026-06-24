export const THEMES = [
  {
    name: "Default",
    className: "theme-default",
    swatch: "#f5f5f0",
    description: "Clean, neutral",
  },
  {
    name: "Forest",
    className: "theme-forest",
    swatch: "#5a7a5a",
    description: "Earthy, grounded",
  },
  {
    name: "Cozy",
    className: "theme-cozy",
    swatch: "#c4956a",
    description: "Warm, intimate",
  },
  {
    name: "Homey",
    className: "theme-homey",
    swatch: "#b8856a",
    description: "Inviting, lived-in",
  },
] as const;

export type ThemeClass = (typeof THEMES)[number]["className"];

export function isValidTheme(className: string | null): className is ThemeClass {
  if (!className) return false;
  return THEMES.some((t) => t.className === className);
}

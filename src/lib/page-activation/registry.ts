export const PAGE_ACTIVATION_REGISTRY = [
  { route: "/todos", label: "Todos" },
  { route: "/weekly", label: "Weekly" },
  { route: "/scorecard", label: "Scorecard" },
  { route: "/horizon", label: "Horizon" },
  { route: "/budget", label: "Budget" },
  { route: "/history", label: "History" },
  { route: "/canvas", label: "Canvas" },
  { route: "/notes", label: "Notes" },
] as const;

export type PageActivationRoute =
  (typeof PAGE_ACTIVATION_REGISTRY)[number]["route"];

export type PageActivationConfig =
  (typeof PAGE_ACTIVATION_REGISTRY)[number];

export function resolvePageActivationRoute(
  pathname: string,
): PageActivationRoute | null {
  for (const page of PAGE_ACTIVATION_REGISTRY) {
    if (pathname === page.route || pathname.startsWith(`${page.route}/`)) {
      return page.route;
    }
  }
  return null;
}

export function isPageActivationRoute(
  pathname: string,
): pathname is PageActivationRoute {
  return resolvePageActivationRoute(pathname) === pathname;
}

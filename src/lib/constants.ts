export const NAV_ITEMS = [
  {
    title: "Dashboard",
    href: "/",
    icon: "layout-dashboard",
  },
  {
    title: "Weekly Planner",
    href: "/weekly",
    icon: "calendar-check",
  },
  {
    title: "Scorecard",
    href: "/scorecard",
    icon: "target",
  },
  {
    title: "Horizon View",
    href: "/horizon",
    icon: "map",
  },
  {
    title: "Time Budget",
    href: "/budget",
    icon: "clock",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: "settings",
  },
] as const;

export const TIME_CATEGORIES = [
  { value: "job_leadership", label: "Job + Leadership", color: "bg-blue-500", max: 45 },
  { value: "immigration_apps", label: "Immigration Apps", color: "bg-green-500", max: 5 },
  { value: "terraform", label: "Terraform", color: "bg-purple-500", max: 2 },
  { value: "aws", label: "AWS", color: "bg-orange-500", max: 2 },
  { value: "kubernetes", label: "Kubernetes", color: "bg-cyan-500", max: 1 },
  { value: "interview_prep", label: "Interview Prep", color: "bg-red-500", max: 2 },
  { value: "networking", label: "Networking", color: "bg-pink-500", max: 1 },
  { value: "showcase_project", label: "Showcase Project", color: "bg-indigo-500", max: 2 },
  { value: "ai_exploration", label: "AI Exploration", color: "bg-yellow-500", max: 2 },
] as const;

export const SKILL_ROTATION = [
  { day: "Monday", skill: "terraform", label: "Terraform" },
  { day: "Tuesday", skill: "aws", label: "AWS" },
  { day: "Wednesday", skill: "kubernetes", label: "Kubernetes" },
  { day: "Thursday", skill: "interview_prep", label: "Interview Prep" },
  { day: "Friday", skill: "leadership", label: "Leadership Learning" },
] as const;

export const IMMIGRATION_STAGES = [
  { value: "saved", label: "Saved" },
  { value: "applied", label: "Applied" },
  { value: "screening", label: "Screening" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
] as const;

export const HORIZONS = [
  { key: "daily", label: "Daily", subtitle: "Execution", color: "bg-emerald-500" },
  { key: "weekly", label: "Weekly", subtitle: "Progress", color: "bg-blue-500" },
  { key: "monthly", label: "Monthly", subtitle: "Career Capital", color: "bg-purple-500" },
  { key: "quarterly", label: "Quarterly", subtitle: "Major Outcomes", color: "bg-amber-500" },
] as const;

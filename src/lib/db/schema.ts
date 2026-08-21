import { sqliteTable, text, integer, real, unique, primaryKey } from "drizzle-orm/sqlite-core";

// ─── Daily Logs ─────────────────────────────────────────────────────────────
export const dailyLogs = sqliteTable("daily_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull().unique(), // "YYYY-MM-DD"
  outcome1: text("outcome_1"),
  outcome2: text("outcome_2"),
  outcome3: text("outcome_3"),
  deepWorkTopic: text("deep_work_topic"),
  deepWorkCompleted: integer("deep_work_completed", { mode: "boolean" }).default(false),
  deepWorkDuration: integer("deep_work_duration"), // minutes
  eveningTaskType: text("evening_task_type"), // applications | cv | linkedin | networking
  eveningCompleted: integer("evening_completed", { mode: "boolean" }).default(false),
  notes: text("notes"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ─── Weekly Plans ───────────────────────────────────────────────────────────
export const weeklyPlans = sqliteTable("weekly_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  weekStart: text("week_start").notNull().unique(), // "YYYY-MM-DD" (Monday)
  appsTarget: integer("apps_target").default(10),
  networkingTarget: integer("networking_target").default(2),
  learningHoursTarget: real("learning_hours_target").default(5),
  projectHoursTarget: real("project_hours_target").default(2),
  aiExplorationHoursTarget: real("ai_exploration_hours_target").default(2),
  terraformHours: real("terraform_hours").default(2),
  awsHours: real("aws_hours").default(2),
  k8sHours: real("k8s_hours").default(1),
  leadershipImprovement: text("leadership_improvement"),
  leadershipCompleted: integer("leadership_completed", { mode: "boolean" }).default(false),
  notes: text("notes"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ─── Weekly Scores ──────────────────────────────────────────────────────────
export const weeklyScores = sqliteTable("weekly_scores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  weekStart: text("week_start").notNull().unique(), // "YYYY-MM-DD"
  applicationsSubmitted: integer("applications_submitted").default(0),
  networkingConversations: integer("networking_conversations").default(0),
  learningHours: real("learning_hours").default(0),
  showcaseProjectHours: real("showcase_project_hours").default(0),
  leadershipImproved: integer("leadership_improved", { mode: "boolean" }).default(false),
  aiExplorationHours: real("ai_exploration_hours").default(0),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ─── Time Logs ──────────────────────────────────────────────────────────────
export const timeLogs = sqliteTable("time_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // "YYYY-MM-DD"
  category: text("category").notNull(),
  //  "job_leadership" | "immigration_apps" | "terraform" | "aws" | "kubernetes"
  // | "interview_prep" | "networking" | "showcase_project" | "ai_exploration"
  hours: real("hours").notNull(),
  description: text("description"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ─── Skill Sessions (Deep Work Block) ──────────────────────────────────────
export const skillSessions = sqliteTable("skill_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  skill: text("skill").notNull(), // terraform | aws | kubernetes | interview_prep | leadership
  durationMinutes: integer("duration_minutes").notNull(),
  completed: integer("completed", { mode: "boolean" }).default(true),
  notes: text("notes"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ─── Protection Logs ────────────────────────────────────────────────────────
export const protectionLogs = sqliteTable("protection_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  requestDescription: text("request_description").notNull(),
  actionTaken: text("action_taken").notNull(), // declined | delegated | deferred | documented
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ─── Immigration Pipeline ───────────────────────────────────────────────────
export const immigrationEntries = sqliteTable("immigration_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  company: text("company").notNull(),
  role: text("role"),
  stage: text("stage").notNull().default("saved"),
  // saved | applied | screening | interview | offer | rejected | withdrawn
  targetCountry: text("target_country"), // canada | europe | gulf | remote
  dateApplied: text("date_applied"),
  nextFollowUp: text("next_follow_up"),
  notes: text("notes"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ─── Quarterly Reviews ──────────────────────────────────────────────────────
export const quarterlyReviews = sqliteTable("quarterly_reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  quarter: integer("quarter").notNull(), // 1-4
  year: integer("year").notNull(),
  marketValueStronger: integer("market_value_stronger", { mode: "boolean" }),
  cloudSkillsStronger: integer("cloud_skills_stronger", { mode: "boolean" }),
  leadershipExperienceBetter: integer("leadership_experience_better", { mode: "boolean" }),
  interviewPerformanceBetter: integer("interview_performance_better", { mode: "boolean" }),
  recruiterResponses: integer("recruiter_responses", { mode: "boolean" }),
  interviewsReceived: integer("interviews_received", { mode: "boolean" }),
  sponsorshipOpportunities: integer("sponsorship_opportunities", { mode: "boolean" }),
  strategyChanged: integer("strategy_changed", { mode: "boolean" }).default(false),
  notes: text("notes"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ─── Deep Work Activities ───────────────────────────────────────────────────
export const deepWorkActivities = sqliteTable("deep_work_activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  icon: text("icon").default("book-open"),
  sortOrder: integer("sort_order").default(0),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ─── Field Config (Settings) ────────────────────────────────────────────────
export const fieldConfig = sqliteTable("field_config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  section: text("section").notNull(), // "weekly_target" | "scorecard"
  key: text("key").notNull(),         // DB column name
  label: text("label").notNull(),     // display label
  unit: text("unit"),                 // "hrs" | null
  color: text("color"),               // hsl for charts
  default_value: real("default_value"),
  max_value: real("max_value"),
  sort_order: integer("sort_order").default(0),
  active: integer("active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

export const pageActivations = sqliteTable("page_activations", {
  route: text("route").primaryKey(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

// ─── Canvases ─────────────────────────────────────────────────────────────────
export const canvases = sqliteTable("canvases", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  viewportX: real("viewport_x"),
  viewportY: real("viewport_y"),
  viewportZoom: real("viewport_zoom"),
  sidebarOpen: integer("sidebar_open", { mode: "boolean" }),
  minimapCollapsed: integer("minimap_collapsed", { mode: "boolean" }),
  position: integer("position"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// ─── Canvas Nodes ────────────────────────────────────────────────────────────
export const canvasNodes = sqliteTable("canvas_nodes", {
  canvasId: text("canvas_id").notNull(),
  noteId: text("note_id").notNull(),
  x: real("x").notNull().default(0),
  y: real("y").notNull().default(0),
  frameId: text("frame_id"),
  updatedAt: integer("updated_at").notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.canvasId, table.noteId] }),
}));

export const canvasTodoNodes = sqliteTable("canvas_todo_nodes", {
  canvasId: text("canvas_id").notNull(),
  todoId: text("todo_id").notNull(),
  x: real("x").notNull().default(0),
  y: real("y").notNull().default(0),
  frameId: text("frame_id"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.canvasId, table.todoId] }),
}));

// ─── Canvas Frames ──────────────────────────────────────────────────────────
export const canvasFrames = sqliteTable("canvas_frames", {
  id: text("id").primaryKey(),
  canvasId: text("canvas_id").notNull(),
  name: text("name").notNull().default("Frame"),
  x: real("x").notNull().default(0),
  y: real("y").notNull().default(0),
  width: real("width").notNull().default(400),
  height: real("height").notNull().default(300),
  color: text("color"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// ─── Canvas Generic Nodes ────────────────────────────────────────────────────
export const canvasGenericNodes = sqliteTable("canvas_generic_nodes", {
  id: text("id").primaryKey(),
  canvasId: text("canvas_id").notNull(),
  content: text("content").notNull().default(""),
  x: real("x").notNull().default(0),
  y: real("y").notNull().default(0),
  frameId: text("frame_id"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// ─── Canvas Note Nodes (resizable sticky notes) ──────────────────────────────
export const canvasNoteNodes = sqliteTable("canvas_note_nodes", {
  id: text("id").primaryKey(),
  canvasId: text("canvas_id").notNull(),
  content: text("content").notNull().default(""),
  x: real("x").notNull().default(0),
  y: real("y").notNull().default(0),
  width: real("width").notNull().default(280),
  height: real("height").notNull().default(200),
  frameId: text("frame_id"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// ─── Canvas Edges ────────────────────────────────────────────────────────────
export const canvasEdges = sqliteTable("canvas_edges", {
  id: text("id").primaryKey(),
  canvasId: text("canvas_id").notNull(),
  sourceNoteId: text("source_note_id").notNull(),
  targetNoteId: text("target_note_id").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => ({
  unqSourceTarget: unique().on(table.canvasId, table.sourceNoteId, table.targetNoteId),
}));

// ─── Quick Notes ─────────────────────────────────────────────────────────────
export const quickNotes = sqliteTable("quick_notes", {
  id: text("id").primaryKey(),
  text: text("text").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  bookmarked: integer("bookmarked", { mode: "boolean" }).default(false),
  archived: integer("archived", { mode: "boolean" }).default(false),
  tags: text("tags").default("[]").notNull(),
});

export const projects = sqliteTable("projects", {
	id: text("id").primaryKey(),
	projectName: text("project_name").notNull().unique(),
	projectPath: text("project_path").notNull().unique(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

// ─── Todos ──────────────────────────────────────────────────────────────────
export const todos = sqliteTable("todos", {
  id: text("id").primaryKey(),
  text: text("text").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  bookmarked: integer("bookmarked", { mode: "boolean" }).default(false),
  severity: text("severity", { enum: ["low", "medium", "high", "critical"] }).default("medium"),
  status: text("status", { enum: ["pending", "in_progress", "done", "cancelled"] }).default("pending"),
  assignedTo: text("assigned_to"),
  projectId: text("project_id").references(() => projects.id, {
    onDelete: "set null",
  }),
});

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;

// ─── Outcome Subtasks ──────────────────────────────────────────────────────
export const outcomeSubtasks = sqliteTable("outcome_subtasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  outcomeIndex: integer("outcome_index").notNull(), // 1, 2, or 3
  text: text("text").notNull(),
  completed: integer("completed", { mode: "boolean" }).default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ─── Daily Items (Chores & Extras) ─────────────────────────────────────────
export const dailyItems = sqliteTable("daily_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  kind: text("kind", { enum: ["chore", "extra"] }).notNull(),
  text: text("text").notNull(),
  completed: integer("completed", { mode: "boolean" }).default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

export type DailyItemKind = "chore" | "extra";

// ─── Showcase Project Milestones ────────────────────────────────────────────
export const showcaseMilestones = sqliteTable("showcase_milestones", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  completed: integer("completed", { mode: "boolean" }).default(false),
  completedDate: text("completed_date"),
  notes: text("notes"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

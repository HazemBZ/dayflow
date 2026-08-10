import assert from "node:assert/strict";
import test from "node:test";

import type {
  CanvasEdgeRow,
  CanvasFrameRow,
  CanvasGenericNodeRow,
  CanvasNodeRow,
  CanvasNoteNodeRow,
  CanvasTodoNodeRow,
} from "@/lib/actions/canvas";
import {
  CLIPBOARD_NUDGE,
  nudgeItems,
  planClipboardSelection,
  shiftItems,
  type ClipboardSelectionInput,
  type ClipboardTodoItem,
} from "@/lib/canvas-clipboard";
import type { TodoDto } from "@/lib/todos/contracts";

function noteRow(overrides: Partial<CanvasNodeRow> = {}): CanvasNodeRow {
  return {
    canvasId: "canvas_1",
    noteId: "note_1",
    x: 0,
    y: 0,
    frameId: null,
    ...overrides,
  };
}

function todoNodeRow(overrides: Partial<CanvasTodoNodeRow> = {}): CanvasTodoNodeRow {
  return {
    canvasId: "canvas_1",
    todoId: "todo_1",
    x: 0,
    y: 0,
    frameId: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function genericRow(overrides: Partial<CanvasGenericNodeRow> = {}): CanvasGenericNodeRow {
  return {
    canvasId: "canvas_1",
    id: "gen_1",
    content: "Generic",
    x: 0,
    y: 0,
    frameId: null,
    ...overrides,
  };
}

function canvasNoteRow(overrides: Partial<CanvasNoteNodeRow> = {}): CanvasNoteNodeRow {
  return {
    canvasId: "canvas_1",
    id: "cnote_1",
    content: "Note",
    x: 0,
    y: 0,
    width: 280,
    height: 200,
    frameId: null,
    ...overrides,
  };
}

function frameRow(overrides: Partial<CanvasFrameRow> = {}): CanvasFrameRow {
  return {
    canvasId: "canvas_1",
    id: "frame_1",
    name: "Frame",
    x: 0,
    y: 0,
    width: 400,
    height: 300,
    color: "hsl(220, 70%, 60%)",
    ...overrides,
  };
}

function edgeRow(overrides: Partial<CanvasEdgeRow> = {}): CanvasEdgeRow {
  return {
    canvasId: "canvas_1",
    id: "edge_1",
    sourceNoteId: "note_1",
    targetNoteId: "note_2",
    ...overrides,
  };
}

function todoDto(overrides: Partial<TodoDto> = {}): TodoDto {
  return {
    id: "todo_1",
    text: "Ship it",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    bookmarked: false,
    severity: "medium",
    status: "pending",
    assignedTo: null,
    projectId: null,
    ...overrides,
  };
}

function makeInput(
  overrides: Partial<ClipboardSelectionInput> = {},
): ClipboardSelectionInput {
  return {
    selectedIds: [],
    nodes: [],
    todoNodes: [],
    genericNodes: [],
    noteNodes: [],
    frames: [],
    edges: [],
    todosById: new Map(),
    ...overrides,
  };
}

test("captures selected notes with their positions", () => {
  const plan = planClipboardSelection(
    makeInput({
      selectedIds: ["note_1", "note_2"],
      nodes: [noteRow({ noteId: "note_1", x: 10, y: 20 }), noteRow({ noteId: "note_2", x: 30, y: 40 })],
    }),
  );

  assert.ok(plan);
  assert.deepEqual(
    plan.items.map((item) => ({ kind: item.kind, id: item.id, x: item.x, y: item.y })),
    [
      { kind: "note", id: "note_1", x: 10, y: 20 },
      { kind: "note", id: "note_2", x: 30, y: 40 },
    ],
  );
  assert.deepEqual(plan.edges, []);
  assert.deepEqual(plan.bounds, { minX: 10, minY: 20 });
});

test("captures selected todos enriched from the todo contract", () => {
  const plan = planClipboardSelection(
    makeInput({
      selectedIds: ["todo:todo_1"],
      todoNodes: [todoNodeRow({ todoId: "todo_1", x: 100, y: 200 })],
      todosById: new Map([
        [
          "todo_1",
          todoDto({
            text: "Write docs",
            severity: "high",
            status: "in_progress",
            bookmarked: true,
            projectId: "project_1",
          }),
        ],
      ]),
    }),
  );

  assert.ok(plan);
  const item = plan.items[0] as ClipboardTodoItem;
  assert.equal(item.kind, "todo");
  assert.equal(item.id, "todo:todo_1");
  assert.equal(item.todoId, "todo_1");
  assert.equal(item.text, "Write docs");
  assert.equal(item.severity, "high");
  assert.equal(item.status, "in_progress");
  assert.equal(item.bookmarked, true);
  assert.equal(item.projectId, "project_1");
  assert.equal(item.x, 100);
  assert.equal(item.y, 200);
  assert.equal(item.frameId, null);
});

test("captures selected generic nodes with their content", () => {
  const plan = planClipboardSelection(
    makeInput({
      selectedIds: ["gen_1"],
      genericNodes: [genericRow({ id: "gen_1", content: "Idea box", x: 5, y: 6 })],
    }),
  );

  assert.ok(plan);
  assert.deepEqual(plan.items, [
    {
      kind: "generic",
      id: "gen_1",
      content: "Idea box",
      x: 5,
      y: 6,
      frameId: null,
    },
  ]);
  assert.deepEqual(plan.edges, []);
});

test("captures selected frames and expands their children", () => {
  const plan = planClipboardSelection(
    makeInput({
      selectedIds: ["frame_1"],
      frames: [frameRow({ id: "frame_1", x: 0, y: 0 })],
      nodes: [noteRow({ noteId: "note_1", x: 10, y: 20, frameId: "frame_1" })],
      todoNodes: [todoNodeRow({ todoId: "todo_1", x: 30, y: 40, frameId: "frame_1" })],
      genericNodes: [genericRow({ id: "gen_1", x: 50, y: 60, frameId: "frame_1" })],
      noteNodes: [canvasNoteRow({ id: "cnote_1", x: 70, y: 80, frameId: "frame_1" })],
      todosById: new Map([["todo_1", todoDto()]]),
    }),
  );

  assert.ok(plan);
  const summary = plan.items.map((item) =>
    item.kind === "frame"
      ? { kind: item.kind, id: item.id }
      : { kind: item.kind, id: item.id, frameId: item.frameId },
  );
  assert.deepEqual(summary, [
    { kind: "frame", id: "frame_1" },
    { kind: "note", id: "note_1", frameId: "frame_1" },
    { kind: "todo", id: "todo:todo_1", frameId: "frame_1" },
    { kind: "generic", id: "gen_1", frameId: "frame_1" },
    { kind: "canvasNote", id: "cnote_1", frameId: "frame_1" },
  ]);
});

test("captures selected canvas notes with size", () => {
  const plan = planClipboardSelection(
    makeInput({
      selectedIds: ["cnote_1"],
      noteNodes: [
        canvasNoteRow({ id: "cnote_1", content: "Sticky idea", x: 12, y: 34, width: 320, height: 180 }),
      ],
    }),
  );

  assert.ok(plan);
  assert.deepEqual(plan.items, [
    {
      kind: "canvasNote",
      id: "cnote_1",
      content: "Sticky idea",
      x: 12,
      y: 34,
      width: 320,
      height: 180,
      frameId: null,
    },
  ]);
  assert.deepEqual(plan.edges, []);
});

test("deduplicates children selected together with their frame", () => {
  const plan = planClipboardSelection(
    makeInput({
      selectedIds: ["frame_1", "note_1", "note_1"],
      frames: [frameRow({ id: "frame_1" })],
      nodes: [noteRow({ noteId: "note_1", x: 10, y: 20, frameId: "frame_1" })],
    }),
  );

  assert.ok(plan);
  const noteIds = plan.items.filter((item) => item.kind === "note").map((item) => item.id);
  assert.deepEqual(noteIds, ["note_1"]);
});

test("deduplicates children shared by expansion order", () => {
  const plan = planClipboardSelection(
    makeInput({
      selectedIds: ["note_1", "frame_1"],
      frames: [frameRow({ id: "frame_1" })],
      nodes: [noteRow({ noteId: "note_1", x: 10, y: 20, frameId: "frame_1" })],
    }),
  );

  assert.ok(plan);
  const noteItems = plan.items.filter((item) => item.kind === "note");
  assert.equal(noteItems.length, 1);
});

test("retains only note edges with both endpoints in the selection", () => {
  const plan = planClipboardSelection(
    makeInput({
      selectedIds: ["note_1", "note_2"],
      nodes: [noteRow({ noteId: "note_1" }), noteRow({ noteId: "note_2" }), noteRow({ noteId: "note_3" })],
      edges: [
        edgeRow({ id: "edge_1", sourceNoteId: "note_1", targetNoteId: "note_2" }),
        edgeRow({ id: "edge_2", sourceNoteId: "note_1", targetNoteId: "note_3" }),
        edgeRow({ id: "edge_3", sourceNoteId: "note_2", targetNoteId: "note_3" }),
      ],
    }),
  );

  assert.ok(plan);
  assert.deepEqual(plan.edges, [
    { sourceNoteId: "note_1", targetNoteId: "note_2" },
  ]);
});

test("returns null for an empty selection", () => {
  const plan = planClipboardSelection(makeInput());
  assert.equal(plan, null);
});

test("returns null when selection resolves to no items", () => {
  const plan = planClipboardSelection(
    makeInput({
      selectedIds: ["todo:todo_1"],
      todoNodes: [todoNodeRow({ todoId: "todo_1" })],
      todosById: new Map(),
    }),
  );
  assert.equal(plan, null);
});

test("clears frameId on items whose frame is not captured", () => {
  const plan = planClipboardSelection(
    makeInput({
      selectedIds: ["note_1"],
      nodes: [noteRow({ noteId: "note_1", x: 10, y: 20, frameId: "frame_1" })],
      frames: [frameRow({ id: "frame_1" })],
    }),
  );

  assert.ok(plan);
  const item = plan.items[0];
  assert.ok(item.kind === "note");
  assert.equal(item.frameId, null);
});

test("computes bounds across all captured items", () => {
  const plan = planClipboardSelection(
    makeInput({
      selectedIds: ["note_1", "todo:todo_1"],
      nodes: [noteRow({ noteId: "note_1", x: 10, y: 20 })],
      todoNodes: [todoNodeRow({ todoId: "todo_1", x: 5, y: 100 })],
      todosById: new Map([["todo_1", todoDto()]]),
    }),
  );

  assert.ok(plan);
  assert.deepEqual(plan.bounds, { minX: 5, minY: 20 });
});

test("nudgeItems shifts every position by the nudge constant without mutating input", () => {
  const plan = planClipboardSelection(
    makeInput({
      selectedIds: ["note_1", "gen_1"],
      nodes: [noteRow({ noteId: "note_1", x: 10, y: 20 })],
      genericNodes: [genericRow({ id: "gen_1", x: 30, y: 40 })],
    }),
  );
  assert.ok(plan);

  const nudged = nudgeItems(plan.items);

  assert.equal(CLIPBOARD_NUDGE, 40);
  assert.notEqual(nudged, plan.items);
  assert.deepEqual(
    nudged.map((item) => ({ id: item.id, x: item.x, y: item.y })),
    [
      { id: "note_1", x: 50, y: 60 },
      { id: "gen_1", x: 70, y: 80 },
    ],
  );
  assert.deepEqual(
    plan.items.map((item) => ({ id: item.id, x: item.x, y: item.y })),
    [
      { id: "note_1", x: 10, y: 20 },
      { id: "gen_1", x: 30, y: 40 },
    ],
  );
});

test("shiftItems translates by arbitrary deltas and stays immutable", () => {
  const plan = planClipboardSelection(
    makeInput({
      selectedIds: ["note_1"],
      nodes: [noteRow({ noteId: "note_1", x: 10, y: 20 })],
    }),
  );
  assert.ok(plan);

  const shifted = shiftItems(plan.items, 5, -3);

  assert.deepEqual(
    shifted.map((item) => ({ x: item.x, y: item.y })),
    [{ x: 15, y: 17 }],
  );
  assert.equal(plan.items[0].x, 10);
  assert.equal(plan.items[0].y, 20);
});

test("shiftItems preserves the discriminated union kind", () => {
  const plan = planClipboardSelection(
    makeInput({
      selectedIds: ["todo:todo_1"],
      todoNodes: [todoNodeRow({ todoId: "todo_1", x: 1, y: 2 })],
      todosById: new Map([["todo_1", todoDto()]]),
    }),
  );
  assert.ok(plan);

  const shifted = nudgeItems(plan.items);
  const todo = shifted[0];
  assert.equal(todo.kind, "todo");
  assert.equal(todo.todoId, "todo_1");
  assert.equal(todo.x, 1 + CLIPBOARD_NUDGE);
  assert.equal(todo.y, 2 + CLIPBOARD_NUDGE);
});

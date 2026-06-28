export type Note = {
  id: string;
  text: string;
  createdAt: number;
  updatedAt: number;
};

export type NotesSnapshot = readonly Note[];

type Listener = () => void;

const STORAGE_KEY = "app:quick-notes";

let _notes: Note[] = [];
const listeners = new Set<Listener>();

// Stable reference — return same array ref when data unchanged
let _lastSnapshot: NotesSnapshot = [];
let _lastSnapshotKey = "";

function serialize(notes: Note[]): string {
  return JSON.stringify(notes.map((n) => [n.id, n.text, n.createdAt, n.updatedAt]));
}

function deserialize(raw: string): Note[] {
  try {
    const parsed: unknown[][] = JSON.parse(raw);
    return parsed.map((a) => ({
      id: String(a[0]),
      text: String(a[1]),
      createdAt: Number(a[2]),
      updatedAt: Number(a[3]),
    }));
  } catch {
    return [];
  }
}

function hydrate() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    _notes = deserialize(raw);
  } catch {
    // corrupt data — start fresh
  }
}

function persist() {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, serialize(_notes));
}

function notify() {
  listeners.forEach((l) => l());
}

hydrate();

// Cross-tab sync
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    _notes = e.newValue ? deserialize(e.newValue) : [];
    _lastSnapshotKey = "";
    notify();
  });
}

const SSR_SNAPSHOT: NotesSnapshot = Object.freeze([]);

export const notesStore = {
  getAll(): readonly Note[] {
    return _notes;
  },

  add(text: string) {
    const now = Date.now();
    const note: Note = {
      id: `note_${now}_${Math.random().toString(36).slice(2, 8)}`,
      text,
      createdAt: now,
      updatedAt: now,
    };
    _notes = [note, ..._notes];
    _lastSnapshotKey = "";
    persist();
    notify();
  },

  remove(id: string) {
    _notes = _notes.filter((n) => n.id !== id);
    _lastSnapshotKey = "";
    persist();
    notify();
  },

  update(id: string, text: string) {
    _notes = _notes.map((n) =>
      n.id === id ? { ...n, text, updatedAt: Date.now() } : n,
    );
    _lastSnapshotKey = "";
    persist();
    notify();
  },

  // ── Reactive hooks interface ──────────────────────────────────────────

  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot(): NotesSnapshot {
    const key = serialize(_notes);
    if (key !== _lastSnapshotKey) {
      _lastSnapshot = Object.freeze([..._notes]);
      _lastSnapshotKey = key;
    }
    return _lastSnapshot;
  },

  getServerSnapshot(): NotesSnapshot {
    return SSR_SNAPSHOT;
  },
};

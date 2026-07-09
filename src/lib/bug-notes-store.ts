import {
  getBugNotes,
  addBugNote,
  removeBugNote,
  updateBugNote,
  updateBugNoteStatus,
  toggleBugNoteBookmark as toggleBookmarkAction,
  type BugNoteRow,
} from "@/lib/actions/bug-notes";

export type BugNote = BugNoteRow;
export type BugNotesSnapshot = readonly BugNote[];

type Listener = () => void;

let _notes: BugNote[] = [];
const listeners = new Set<Listener>();

let _loaded = false;

const _emptySnapshot: BugNotesSnapshot = Object.freeze([]);
let _lastSnapshot: BugNotesSnapshot = _emptySnapshot;
let _lastSnapshotKey = "";

function serialize(notes: BugNote[]): string {
  return JSON.stringify(
    notes.map((n) => [n.id, n.text, n.createdAt, n.updatedAt]),
  );
}

function notify() {
  listeners.forEach((l) => l());
}

export const bugNotesStore = {
  get loaded(): boolean {
    return _loaded;
  },

  async load() {
    const notes = await getBugNotes();
    _notes = notes;
    _loaded = true;
    _lastSnapshotKey = "";
    notify();
  },

  getAll(): readonly BugNote[] {
    return _notes;
  },

  async add(text: string) {
    const note = await addBugNote(text);
    _notes = [note, ..._notes];
    _lastSnapshotKey = "";
    notify();
  },

  async remove(id: string) {
    await removeBugNote(id);
    _notes = _notes.filter((n) => n.id !== id);
    _lastSnapshotKey = "";
    notify();
  },

  async update(id: string, text: string) {
    await updateBugNote(id, text);
    _notes = _notes.map((n) =>
      n.id === id ? { ...n, text, updatedAt: Date.now() } : n,
    );
    _lastSnapshotKey = "";
    notify();
  },

  async updateStatus(id: string, status: BugNote["status"]) {
    const updated = await updateBugNoteStatus(id, status);
    _notes = _notes.map((n) =>
      n.id === id
        ? { ...n, status: updated.status, updatedAt: updated.updatedAt }
        : n,
    );
    _lastSnapshotKey = "";
    notify();
  },

  async toggleBookmark(id: string) {
    const updated = await toggleBookmarkAction(id);
    _notes = _notes.map((n) =>
      n.id === id
        ? {
            ...n,
            bookmarked: updated.bookmarked,
            updatedAt: updated.updatedAt,
          }
        : n,
    );
    _lastSnapshotKey = "";
    notify();
  },

  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot(): BugNotesSnapshot {
    const key = serialize(_notes);
    if (key !== _lastSnapshotKey) {
      _lastSnapshot = Object.freeze([..._notes]);
      _lastSnapshotKey = key;
    }
    return _lastSnapshot;
  },

  getServerSnapshot(): BugNotesSnapshot {
    return _emptySnapshot;
  },
};

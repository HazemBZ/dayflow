import { getNotes, addNote, removeNote, updateNote, toggleBookmark as toggleBookmarkAction, toggleArchive as toggleArchiveAction, setNoteTags, type NoteRow } from "@/lib/actions/notes";

export type Note = NoteRow;
export type NotesSnapshot = readonly Note[];

type Listener = () => void;

let _notes: Note[] = [];
const listeners = new Set<Listener>();

let _loaded = false;

// Stable references — return same array refs to avoid infinite loops
const _emptySnapshot: NotesSnapshot = Object.freeze([]);
let _lastSnapshot: NotesSnapshot = _emptySnapshot;
let _lastSnapshotKey = "";

function serialize(notes: Note[]): string {
  return JSON.stringify(notes.map((n) => [n.id, n.text, n.createdAt, n.updatedAt, n.tags]));
}

function notify() {
  listeners.forEach((l) => l());
}

export const notesStore = {
  /** Whether the store has been initialised from the server. */
  get loaded(): boolean {
    return _loaded;
  },

  /** Fetch all notes from DB — call once on mount. */
  async load() {
    const notes = await getNotes(true /* includeArchived */);
    _notes = notes;
    _loaded = true;
    _lastSnapshotKey = "";
    notify();
  },

  getAll(): readonly Note[] {
    return _notes;
  },

  async add(text: string, tags?: string[]): Promise<Note> {
    const note = await addNote(text, tags);
    _notes = [note, ..._notes];
    _lastSnapshotKey = "";
    notify();
    return note;
  },

  async remove(id: string) {
    await removeNote(id);
    _notes = _notes.filter((n) => n.id !== id);
    _lastSnapshotKey = "";
    notify();
  },

  async update(id: string, text: string) {
    await updateNote(id, text);
    _notes = _notes.map((n) =>
      n.id === id ? { ...n, text, updatedAt: Date.now() } : n,
    );
    _lastSnapshotKey = "";
    notify();
  },

  async toggleBookmark(id: string) {
    const updated = await toggleBookmarkAction(id);
    _notes = _notes.map((n) =>
      n.id === id ? { ...n, bookmarked: updated.bookmarked, updatedAt: updated.updatedAt } : n,
    );
    _lastSnapshotKey = "";
    notify();
  },

  async toggleArchive(id: string) {
    const updated = await toggleArchiveAction(id);
    _notes = _notes.map((n) =>
      n.id === id ? { ...n, archived: updated.archived, updatedAt: updated.updatedAt } : n,
    );
    _lastSnapshotKey = "";
    notify();
  },

  async setTags(id: string, tags: string[]) {
    const updated = await setNoteTags(id, tags);
    _notes = _notes.map((n) =>
      n.id === id ? { ...n, tags: updated.tags, updatedAt: updated.updatedAt } : n,
    );
    _lastSnapshotKey = "";
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
    return _emptySnapshot;
  },
};
